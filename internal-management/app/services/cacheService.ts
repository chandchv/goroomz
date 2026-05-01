import Dexie, { type Table } from 'dexie';

// Cache expiration time: 1 hour (in milliseconds)
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

// Define the structure of cached data
interface CachedData<T = any> {
  id: string;
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Define the database schema
class CacheDatabase extends Dexie {
  rooms!: Table<CachedData, string>;
  bookings!: Table<CachedData, string>;
  guests!: Table<CachedData, string>;
  payments!: Table<CachedData, string>;
  metadata!: Table<CachedData, string>;
  // Internal role tables
  leads!: Table<CachedData, string>;
  commissions!: Table<CachedData, string>;
  territories!: Table<CachedData, string>;
  tickets!: Table<CachedData, string>;
  analytics!: Table<CachedData, string>;

  constructor() {
    super('InternalManagementCache');
    
    // Define database schema - version 2 adds internal role tables
    this.version(1).stores({
      rooms: 'id, timestamp, expiresAt',
      bookings: 'id, timestamp, expiresAt',
      guests: 'id, timestamp, expiresAt',
      payments: 'id, timestamp, expiresAt',
      metadata: 'id, timestamp, expiresAt'
    });

    // Version 2: Add internal role tables
    this.version(2).stores({
      rooms: 'id, timestamp, expiresAt',
      bookings: 'id, timestamp, expiresAt',
      guests: 'id, timestamp, expiresAt',
      payments: 'id, timestamp, expiresAt',
      metadata: 'id, timestamp, expiresAt',
      leads: 'id, timestamp, expiresAt',
      commissions: 'id, timestamp, expiresAt',
      territories: 'id, timestamp, expiresAt',
      tickets: 'id, timestamp, expiresAt',
      analytics: 'id, timestamp, expiresAt'
    });
  }
}

// Create database instance
const db = new CacheDatabase();

/**
 * Cache Service for managing local data storage
 */
export const cacheService = {
  /**
   * Store data in cache with automatic expiration
   */
  async set<T>(
    table: 'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics',
    id: string,
    data: T,
    expirationMs: number = CACHE_EXPIRATION_MS
  ): Promise<void> {
    const now = Date.now();
    const cachedData: CachedData<T> = {
      id,
      data,
      timestamp: now,
      expiresAt: now + expirationMs
    };

    await db[table].put(cachedData);
  },

  /**
   * Retrieve data from cache
   * Returns null if data is expired or doesn't exist
   */
  async get<T>(
    table: 'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics',
    id: string
  ): Promise<T | null> {
    const cached = await db[table].get(id);
    
    if (!cached) {
      return null;
    }

    // Check if data has expired
    if (Date.now() > cached.expiresAt) {
      // Remove expired data
      await db[table].delete(id);
      return null;
    }

    return cached.data as T;
  },

  /**
   * Get all items from a table (non-expired only)
   */
  async getAll<T>(
    table: 'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics'
  ): Promise<T[]> {
    const now = Date.now();
    const allItems = await db[table].toArray();
    
    // Filter out expired items and extract data
    const validItems = allItems
      .filter(item => item.expiresAt > now)
      .map(item => item.data as T);

    // Clean up expired items
    const expiredIds = allItems
      .filter(item => item.expiresAt <= now)
      .map(item => item.id);
    
    if (expiredIds.length > 0) {
      await db[table].bulkDelete(expiredIds);
    }

    return validItems;
  },

  /**
   * Store multiple items in cache
   */
  async setMany<T>(
    table: 'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics',
    items: Array<{ id: string; data: T }>,
    expirationMs: number = CACHE_EXPIRATION_MS
  ): Promise<void> {
    const now = Date.now();
    const cachedItems: CachedData<T>[] = items.map(item => ({
      id: item.id,
      data: item.data,
      timestamp: now,
      expiresAt: now + expirationMs
    }));

    await db[table].bulkPut(cachedItems);
  },

  /**
   * Remove specific item from cache
   */
  async remove(
    table: 'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics',
    id: string
  ): Promise<void> {
    await db[table].delete(id);
  },

  /**
   * Clear all data from a specific table
   */
  async clearTable(
    table: 'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics'
  ): Promise<void> {
    await db[table].clear();
  },

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      db.rooms.clear(),
      db.bookings.clear(),
      db.guests.clear(),
      db.payments.clear(),
      db.metadata.clear(),
      db.leads.clear(),
      db.commissions.clear(),
      db.territories.clear(),
      db.tickets.clear(),
      db.analytics.clear()
    ]);
  },

  /**
   * Remove all expired items from all tables
   */
  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const tables: Array<'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics'> = [
      'rooms',
      'bookings',
      'guests',
      'payments',
      'metadata',
      'leads',
      'commissions',
      'territories',
      'tickets',
      'analytics'
    ];

    for (const table of tables) {
      const expiredItems = await db[table]
        .where('expiresAt')
        .below(now)
        .toArray();
      
      const expiredIds = expiredItems.map(item => item.id);
      
      if (expiredIds.length > 0) {
        await db[table].bulkDelete(expiredIds);
      }
    }
  },

  /**
   * Check if data exists and is not expired
   */
  async has(
    table: 'rooms' | 'bookings' | 'guests' | 'payments' | 'metadata' | 'leads' | 'commissions' | 'territories' | 'tickets' | 'analytics',
    id: string
  ): Promise<boolean> {
    const cached = await db[table].get(id);
    
    if (!cached) {
      return false;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      await db[table].delete(id);
      return false;
    }

    return true;
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    rooms: number;
    bookings: number;
    guests: number;
    payments: number;
    metadata: number;
    leads: number;
    commissions: number;
    territories: number;
    tickets: number;
    analytics: number;
    total: number;
  }> {
    const [rooms, bookings, guests, payments, metadata, leads, commissions, territories, tickets, analytics] = await Promise.all([
      db.rooms.count(),
      db.bookings.count(),
      db.guests.count(),
      db.payments.count(),
      db.metadata.count(),
      db.leads.count(),
      db.commissions.count(),
      db.territories.count(),
      db.tickets.count(),
      db.analytics.count()
    ]);

    return {
      rooms,
      bookings,
      guests,
      payments,
      metadata,
      leads,
      commissions,
      territories,
      tickets,
      analytics,
      total: rooms + bookings + guests + payments + metadata + leads + commissions + territories + tickets + analytics
    };
  },

  /**
   * Cache room status data
   */
  async cacheRoomStatus(rooms: any[]): Promise<void> {
    const items = rooms.map(room => ({
      id: room.id.toString(),
      data: room
    }));
    await this.setMany('rooms', items);
  },

  /**
   * Cache today's bookings
   */
  async cacheTodayBookings(bookings: any[]): Promise<void> {
    const items = bookings.map(booking => ({
      id: booking.id.toString(),
      data: booking
    }));
    await this.setMany('bookings', items);
  },

  /**
   * Cache guest information
   */
  async cacheGuestInfo(guests: any[]): Promise<void> {
    const items = guests.map(guest => ({
      id: guest.id.toString(),
      data: guest
    }));
    await this.setMany('guests', items);
  },

  /**
   * Get cached room status
   */
  async getCachedRoomStatus(): Promise<any[]> {
    return this.getAll('rooms');
  },

  /**
   * Get cached bookings
   */
  async getCachedBookings(): Promise<any[]> {
    return this.getAll('bookings');
  },

  /**
   * Get cached guest info
   */
  async getCachedGuestInfo(): Promise<any[]> {
    return this.getAll('guests');
  },

  /**
   * Cache leads data (for agents)
   */
  async cacheLeads(leads: any[]): Promise<void> {
    const items = leads.map(lead => ({
      id: lead.id.toString(),
      data: lead
    }));
    await this.setMany('leads', items);
  },

  /**
   * Get cached leads
   */
  async getCachedLeads(): Promise<any[]> {
    return this.getAll('leads');
  },

  /**
   * Cache commission data (for agents)
   */
  async cacheCommissions(commissions: any[]): Promise<void> {
    const items = commissions.map(commission => ({
      id: commission.id.toString(),
      data: commission
    }));
    await this.setMany('commissions', items);
  },

  /**
   * Get cached commissions
   */
  async getCachedCommissions(): Promise<any[]> {
    return this.getAll('commissions');
  },

  /**
   * Cache territory data (for regional managers)
   */
  async cacheTerritories(territories: any[]): Promise<void> {
    const items = territories.map(territory => ({
      id: territory.id.toString(),
      data: territory
    }));
    await this.setMany('territories', items);
  },

  /**
   * Get cached territories
   */
  async getCachedTerritories(): Promise<any[]> {
    return this.getAll('territories');
  },

  /**
   * Cache support tickets (for operations managers)
   */
  async cacheTickets(tickets: any[]): Promise<void> {
    const items = tickets.map(ticket => ({
      id: ticket.id.toString(),
      data: ticket
    }));
    await this.setMany('tickets', items);
  },

  /**
   * Get cached tickets
   */
  async getCachedTickets(): Promise<any[]> {
    return this.getAll('tickets');
  },

  /**
   * Cache analytics data (for all roles)
   */
  async cacheAnalytics(key: string, data: any): Promise<void> {
    await this.set('analytics', key, data);
  },

  /**
   * Get cached analytics
   */
  async getCachedAnalytics(key: string): Promise<any | null> {
    return this.get('analytics', key);
  }
};

// Export database instance for advanced usage
export { db };
