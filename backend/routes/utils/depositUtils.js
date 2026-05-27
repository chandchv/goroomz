const { v4: uuidv4 } = require('uuid');

const DEPOSIT_TABLES = ['deposits', 'security_deposits'];

function mapDatabaseList(list, key) {
  if (!list || !Array.isArray(list)) return [];
  return list.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item[0];
    return item[key] || item[key.toUpperCase()] || null;
  }).filter(Boolean);
}


/**
 * Read column names for a deposit table from information_schema.
 */
async function getDepositSchema(sequelize, tableName) {
  const cols = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :tableName`,
    { replacements: { tableName }, type: sequelize.QueryTypes.SELECT }
  );
  const names = new Set(mapDatabaseList(cols, 'column_name'));

  return {
    tableName,
    hasPaymentMethod: names.has('payment_method'),
    hasCollectedDate: names.has('collected_date'),
    hasMetadata: names.has('metadata'),
    hasRefundAmount: names.has('refund_amount'),
    hasRefundDate: names.has('refund_date'),
    hasRefundedBy: names.has('refunded_by'),
    hasDeductions: names.has('deductions'),
    hasBookingUnique: true, // assumed if ON CONFLICT used
  };
}

/**
 * Pick deposit table: prefer table that has rows, else first that exists.
 */
async function resolveDepositTable(sequelize) {
  const tables = await sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('deposits', 'security_deposits')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const names = mapDatabaseList(tables, 'table_name');

  for (const tableName of DEPOSIT_TABLES) {
    if (!names.includes(tableName)) continue;
    try {
      const [{ count }] = await sequelize.query(
        `SELECT COUNT(*)::int AS count FROM ${tableName}`,
        { type: sequelize.QueryTypes.SELECT }
      );
      if (count > 0) return tableName;
    } catch (err) {
      console.warn(`Could not count ${tableName}:`, err.message);
    }
  }

  if (names.includes('deposits')) return 'deposits';
  if (names.includes('security_deposits')) return 'security_deposits';
  return null;
}

/**
 * Create or update a deposit for a booking.
 */
async function upsertDepositForBooking(sequelize, { bookingId, amount, paymentMethod }) {
  const tables = await sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('deposits', 'security_deposits')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const names = mapDatabaseList(tables, 'table_name');

  let lastError;
  for (const tableName of DEPOSIT_TABLES.filter((t) => names.includes(t))) {
    try {
      const schema = await getDepositSchema(sequelize, tableName);
      const id = uuidv4();
      const method = paymentMethod || 'cash';

      if (schema.hasPaymentMethod && schema.hasCollectedDate) {
        await sequelize.query(
          `INSERT INTO ${tableName} (id, booking_id, amount, payment_method, status, collected_date, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'collected', NOW(), NOW(), NOW())
           ON CONFLICT (booking_id) DO UPDATE SET
             amount = EXCLUDED.amount,
             payment_method = EXCLUDED.payment_method,
             status = 'collected',
             collected_date = NOW(),
             updated_at = NOW()`,
          { bind: [id, bookingId, amount, method] }
        );
      } else if (schema.hasMetadata) {
        try {
          await sequelize.query(
            `ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_booking_id_unique UNIQUE (booking_id)`,
            { type: sequelize.QueryTypes.RAW }
          );
        } catch (_) { /* exists */ }

        await sequelize.query(
          `INSERT INTO ${tableName} (id, booking_id, amount, status, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, 'collected', $4::jsonb, NOW(), NOW())
           ON CONFLICT (booking_id) DO UPDATE SET
             amount = EXCLUDED.amount,
             status = 'collected',
             metadata = COALESCE(${tableName}.metadata, '{}'::jsonb) || $4::jsonb,
             updated_at = NOW()`,
          {
            bind: [
              id,
              bookingId,
              amount,
              JSON.stringify({ paymentMethod: method, collectedDate: new Date().toISOString() }),
            ],
          }
        );
      } else {
        // Minimal schema: booking_id, amount, status only
        try {
          await sequelize.query(
            `ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_booking_id_unique UNIQUE (booking_id)`,
            { type: sequelize.QueryTypes.RAW }
          );
        } catch (_) { /* exists */ }

        await sequelize.query(
          `INSERT INTO ${tableName} (id, booking_id, amount, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'collected', NOW(), NOW())
           ON CONFLICT (booking_id) DO UPDATE SET
             amount = EXCLUDED.amount,
             status = 'collected',
             updated_at = NOW()`,
          { bind: [id, bookingId, amount] }
        );
      }
      return tableName;
    } catch (err) {
      lastError = err;
      console.error(`Deposit upsert failed on ${tableName}:`, err.message);
    }
  }

  throw lastError || new Error('No deposits table found in database');
}

function buildDepositSelectCols(schema) {
  if (schema.hasPaymentMethod) {
    return `
      d.id,
      d.booking_id AS "bookingId",
      d.amount,
      d.payment_method AS "paymentMethod",
      d.status,
      ${schema.hasCollectedDate ? 'd.collected_date' : 'd.created_at'} AS "collectedDate",
      ${schema.hasRefundAmount ? 'd.refund_amount' : 'NULL'} AS "refundAmount",
      ${schema.hasRefundDate ? 'd.refund_date' : 'NULL'} AS "refundDate",
      ${schema.hasDeductions ? 'd.deductions' : 'NULL'} AS "deductions",
      d.created_at AS "createdAt",
      d.updated_at AS "updatedAt"`;
  }

  if (schema.hasMetadata) {
    return `
      d.id,
      d.booking_id AS "bookingId",
      d.amount,
      COALESCE(d.metadata->>'paymentMethod', 'cash') AS "paymentMethod",
      d.status,
      COALESCE(d.metadata->>'collectedDate', d.created_at::text) AS "collectedDate",
      NULL AS "refundAmount",
      NULL AS "refundDate",
      NULL AS "deductions",
      d.created_at AS "createdAt",
      d.updated_at AS "updatedAt"`;
  }

  return `
    d.id,
    d.booking_id AS "bookingId",
    d.amount,
    'cash' AS "paymentMethod",
    d.status,
    d.created_at AS "collectedDate",
    NULL AS "refundAmount",
    NULL AS "refundDate",
    NULL AS "deductions",
    d.created_at AS "createdAt",
    d.updated_at AS "updatedAt"`;
}

/**
 * Batch-fetch deposits for booking list (used by bookings API).
 */
async function fetchDepositsForBookings(sequelize, bookingIds) {
  if (!bookingIds.length) return {};

  const byBookingId = {};

  for (const tableName of DEPOSIT_TABLES) {
    try {
      const schema = await getDepositSchema(sequelize, tableName);
      const selectCols = schema.hasPaymentMethod
        ? `booking_id, amount, payment_method, status, ${schema.hasCollectedDate ? 'collected_date' : 'created_at AS collected_date'}`
        : schema.hasMetadata
          ? `booking_id, amount, status, metadata, created_at AS collected_date`
          : `booking_id, amount, status, created_at AS collected_date`;

      const rows = await sequelize.query(
        `SELECT ${selectCols} FROM ${tableName} WHERE booking_id = ANY($1::uuid[])`,
        { bind: [bookingIds], type: sequelize.QueryTypes.SELECT }
      );

      rows.forEach((d) => {
        const meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : d.metadata;
        byBookingId[d.booking_id] = {
          amount: d.amount,
          payment_method: d.payment_method || meta?.paymentMethod || 'cash',
          status: d.status || 'collected',
          collected_date: d.collected_date,
        };
      });
    } catch (err) {
      console.warn(`Could not fetch deposits from ${tableName}:`, err.message);
    }
  }

  return byBookingId;
}

/**
 * List deposits with property / owner / search filters.
 */
async function listDeposits(sequelize, options) {
  const tableName = await resolveDepositTable(sequelize);
  if (!tableName) {
    return { rows: [], total: 0, tableName: null };
  }

  const schema = await getDepositSchema(sequelize, tableName);
  const {
    propertyId,
    ownerId,
    status,
    paymentMethod,
    search,
    limit = 20,
    offset = 0,
  } = options;

  const conditions = ['d.booking_id IS NOT NULL'];
  const replacements = { limit, offset };

  if (status) {
    conditions.push('d.status = :status');
    replacements.status = status;
  }
  if (paymentMethod && schema.hasPaymentMethod) {
    conditions.push('d.payment_method = :paymentMethod');
    replacements.paymentMethod = paymentMethod;
  } else if (paymentMethod && schema.hasMetadata) {
    conditions.push(`d.metadata->>'paymentMethod' = :paymentMethod`);
    replacements.paymentMethod = paymentMethod;
  }

  let scopeSql = '';
  if (propertyId) {
    scopeSql = `AND (
      b.property_id = :propertyId::uuid
      OR b.room_id IN (
        SELECT id FROM rooms
        WHERE property_details->>'propertyId' = :propertyId
           OR property_id::text = :propertyId
      )
    )`;
    replacements.propertyId = propertyId;
  } else if (ownerId) {
    scopeSql = 'AND b.owner_id = :ownerId::uuid';
    replacements.ownerId = ownerId;
  }

  if (search && search.trim()) {
    scopeSql += ` AND (
      u.name ILIKE :search
      OR u.email ILIKE :search
      OR u.phone ILIKE :search
      OR r.room_number ILIKE :search
      OR r.title ILIKE :search
      OR b.id::text ILIKE :search
    )`;
    replacements.search = `%${search.trim()}%`;
  }

  const selectCols = buildDepositSelectCols(schema);
  const fromClause = `
    FROM ${tableName} d
    INNER JOIN bookings b ON d.booking_id = b.id
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN rooms r ON b.room_id = r.id
    WHERE ${conditions.join(' AND ')} ${scopeSql}
  `;

  const [{ total }] = await sequelize.query(
    `SELECT COUNT(*)::int AS total ${fromClause}`,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );

  const rows = await sequelize.query(
    `SELECT
      ${selectCols},
      b.check_in AS "checkIn",
      b.check_out AS "checkOut",
      b.total_amount AS "totalAmount",
      b.status AS "bookingStatus",
      b.guests,
      b.contact_info AS "contactInfo",
      b.booking_type AS "bookingType",
      u.id AS "userId",
      u.name AS "userName",
      u.email AS "userEmail",
      u.phone AS "userPhone",
      r.id AS "roomId",
      r.title AS "roomTitle",
      r.room_number AS "roomNumber"
    ${fromClause}
    ORDER BY d.created_at DESC NULLS LAST
    LIMIT :limit OFFSET :offset`,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );

  return { rows: rows.map(formatDepositRow), total, tableName };
}

async function queryDepositRow(sequelize, tableName, bookingId) {
  const schema = await getDepositSchema(sequelize, tableName);
  const selectCols = buildDepositSelectCols(schema);

  const rows = await sequelize.query(
    `SELECT
      ${selectCols},
      b.check_in AS "checkIn",
      b.check_out AS "checkOut",
      b.total_amount AS "totalAmount",
      b.status AS "bookingStatus",
      b.guests,
      b.contact_info AS "contactInfo",
      b.booking_type AS "bookingType",
      u.id AS "userId",
      u.name AS "userName",
      u.email AS "userEmail",
      u.phone AS "userPhone",
      r.id AS "roomId",
      r.title AS "roomTitle",
      r.room_number AS "roomNumber"
    FROM ${tableName} d
    INNER JOIN bookings b ON d.booking_id = b.id
    LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN rooms r ON b.room_id = r.id
    WHERE d.booking_id = :bookingId
    LIMIT 1`,
    { replacements: { bookingId }, type: sequelize.QueryTypes.SELECT }
  );

  if (!rows.length) return null;
  return formatDepositRow(rows[0]);
}

function formatDepositRow(row) {
  let contactInfo = row.contactInfo || {};
  if (typeof contactInfo === 'string') {
    try {
      contactInfo = JSON.parse(contactInfo);
    } catch (e) {
      contactInfo = {};
    }
  }

  const roomNumber = row.roomNumber || (row.roomTitle || '').replace('Room ', '') || 'N/A';
  const bookingType = row.bookingType || contactInfo.bookingType || 'daily';
  const bedNumber = contactInfo.bedNumber || 1;

  return {
    id: row.id,
    bookingId: row.bookingId,
    amount: parseFloat(row.amount) || 0,
    paymentMethod: row.paymentMethod || 'cash',
    status: row.status || 'collected',
    collectedDate: row.collectedDate,
    refundAmount: row.refundAmount != null ? parseFloat(row.refundAmount) : undefined,
    refundDate: row.refundDate,
    deductions: row.deductions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    booking: {
      id: row.bookingId,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      totalAmount: parseFloat(row.totalAmount) || 0,
      status: row.bookingStatus,
      guests: row.guests,
      bookingType,
      user: {
        id: row.userId,
        name: contactInfo.name || row.userName || 'Guest',
        email: contactInfo.email || row.userEmail || '',
        phone: contactInfo.phone || row.userPhone || '',
      },
      room: {
        id: row.roomId,
        title: row.roomTitle,
        roomNumber,
        bedNumber,
        floorNumber: Math.floor(parseInt(roomNumber, 10) / 100) || 1,
      },
    },
  };
}

async function getDepositByBookingId(sequelize, bookingId) {
  const tables = await sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('deposits', 'security_deposits')`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const names = mapDatabaseList(tables, 'table_name');

  for (const tableName of DEPOSIT_TABLES) {
    if (!names.includes(tableName)) continue;
    const deposit = await queryDepositRow(sequelize, tableName, bookingId);
    if (deposit) return deposit;
  }
  return null;
}

async function refundDepositForBooking(sequelize, { bookingId, refundedBy, deductions }) {
  const tableName = await resolveDepositTable(sequelize);
  if (!tableName) return;

  const schema = await getDepositSchema(sequelize, tableName);

  if (schema.hasRefundDate && schema.hasRefundedBy) {
    await sequelize.query(
      `UPDATE ${tableName}
       SET status = 'refunded',
           refund_date = NOW(),
           refunded_by = :refundedBy,
           deductions = :deductions,
           updated_at = NOW()
       WHERE booking_id = :bookingId`,
      {
        replacements: {
          bookingId,
          refundedBy,
          deductions: deductions != null ? JSON.stringify(deductions) : null,
        },
      }
    );
  } else if (schema.hasMetadata) {
    await sequelize.query(
      `UPDATE ${tableName}
       SET status = 'refunded',
           metadata = COALESCE(metadata, '{}'::jsonb) || :meta::jsonb,
           updated_at = NOW()
       WHERE booking_id = :bookingId`,
      {
        replacements: {
          bookingId,
          meta: JSON.stringify({
            refundDate: new Date().toISOString(),
            refundedBy,
            deductions,
          }),
        },
      }
    );
  } else {
    await sequelize.query(
      `UPDATE ${tableName} SET status = 'refunded', updated_at = NOW() WHERE booking_id = :bookingId`,
      { replacements: { bookingId } }
    );
  }
}

module.exports = {
  resolveDepositTable,
  getDepositSchema,
  upsertDepositForBooking,
  fetchDepositsForBookings,
  listDeposits,
  getDepositByBookingId,
  refundDepositForBooking,
};
