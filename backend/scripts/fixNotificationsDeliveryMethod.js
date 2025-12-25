const { sequelize } = require('../models');

(async () => {
  try {
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'delivery_method'
        ) THEN
          RETURN;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'notifications'
            AND column_name = 'delivery_method'
            AND data_type = 'ARRAY'
            AND udt_name LIKE '_enum_notifications_delivery_method'
        ) THEN
          RETURN;
        END IF;

        PERFORM 1
        FROM pg_type
        WHERE typname = 'enum_notifications_delivery_method';

        IF NOT FOUND THEN
          CREATE TYPE "public"."enum_notifications_delivery_method" AS ENUM ('in_app', 'email', 'sms');
        END IF;

        EXECUTE '
          ALTER TABLE "notifications"
          ALTER COLUMN "delivery_method" TYPE "public"."enum_notifications_delivery_method"[]
          USING (
            CASE
              WHEN "delivery_method" IS NULL THEN NULL
              WHEN pg_typeof("delivery_method")::text = ''public.enum_notifications_delivery_method[]'' THEN "delivery_method"
              WHEN pg_typeof("delivery_method")::text LIKE ''%[]'' THEN "delivery_method"::"public"."enum_notifications_delivery_method"[]
              ELSE ARRAY["delivery_method"]::"public"."enum_notifications_delivery_method"[]
            END
          )
        ';
      END $$;
    `);

    console.log('✅ notifications.delivery_method column verified');
  } catch (error) {
    console.error('❌ Failed to ensure notifications.delivery_method column:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();

