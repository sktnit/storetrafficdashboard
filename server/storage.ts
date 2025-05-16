import { 
  users, 
  storeEvents,
  hourlyTraffic,
  type User,
  type InsertUser,
  type StoreEvent,
  type InsertStoreEvent,
  type HourlyTraffic, 
  type InsertHourlyTraffic,
  type KafkaMessage,
  type StoreStats,
  type HistoricalStats
} from "@shared/schema";
import { format, subHours, startOfHour, endOfHour, compareAsc } from "date-fns";
import { db } from "./db";
import { eq, desc, lte, gte, and, sql } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User methods (from original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Store event methods
  saveStoreEvent(event: InsertStoreEvent): Promise<StoreEvent>;
  getRecentEvents(storeId: number, limit: number): Promise<StoreEvent[]>;
  
  // Hourly traffic methods
  saveHourlyTraffic(hourlyData: InsertHourlyTraffic): Promise<HourlyTraffic>;
  getHourlyTraffic(storeId: number, hours: number): Promise<HourlyTraffic[]>;
  
  // Stats methods
  getCurrentStats(storeId: number): Promise<StoreStats>;
  getHistoricalStats(storeId: number): Promise<HistoricalStats>;
  
  // Process a Kafka message
  processKafkaMessage(message: KafkaMessage): Promise<void>;
  
  // Initialize with seed data if needed
  initializeStore(storeId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private storeStats: Map<number, StoreStats>;
  
  constructor() {
    this.storeStats = new Map();
    
    // Initialize stats cache for 3 stores
    [10, 11, 12].forEach(storeId => {
      this.storeStats.set(storeId, {
        currentCustomers: 0,
        customersInToday: 0,
        customersOutToday: 0,
        lastUpdated: format(new Date(), 'HH:mm:ss')
      });
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Store event methods
  async saveStoreEvent(event: InsertStoreEvent): Promise<StoreEvent> {
    const [storeEvent] = await db.insert(storeEvents).values({
      store_id: event.store_id,
      customers_in: event.customers_in,
      customers_out: event.customers_out,
      timestamp: event.timestamp
    }).returning();
    
    return storeEvent;
  }
  
  async getRecentEvents(storeId: number, limit: number): Promise<StoreEvent[]> {
    return await db.select()
      .from(storeEvents)
      .where(eq(storeEvents.store_id, storeId))
      .orderBy(desc(storeEvents.timestamp))
      .limit(limit);
  }
  
  // Hourly traffic methods
  async saveHourlyTraffic(hourlyData: InsertHourlyTraffic): Promise<HourlyTraffic> {
    // Ensure all required fields have values
    const safeHourlyData = {
      store_id: hourlyData.store_id,
      hour_start: hourlyData.hour_start,
      customers_in: hourlyData.customers_in || 0,
      customers_out: hourlyData.customers_out || 0,
      net_flow: hourlyData.net_flow || 0,
      ending_count: hourlyData.ending_count || 0
    };
    
    // Check if we already have data for this hour
    const hourStartTime = format(safeHourlyData.hour_start, 'yyyy-MM-dd HH:00:00');
    const [existingHour] = await db.select()
      .from(hourlyTraffic)
      .where(
        and(
          eq(hourlyTraffic.store_id, safeHourlyData.store_id),
          sql`CAST(${hourlyTraffic.hour_start} AS TEXT) LIKE ${hourStartTime + '%'}`
        )
      );
    
    if (existingHour) {
      // Update existing record
      const [updatedHour] = await db.update(hourlyTraffic)
        .set({
          customers_in: existingHour.customers_in + safeHourlyData.customers_in,
          customers_out: existingHour.customers_out + safeHourlyData.customers_out,
          net_flow: existingHour.net_flow + safeHourlyData.net_flow,
          ending_count: safeHourlyData.ending_count
        })
        .where(eq(hourlyTraffic.id, existingHour.id))
        .returning();
      
      return updatedHour;
    } else {
      // Insert new record
      const [newHour] = await db.insert(hourlyTraffic)
        .values(safeHourlyData)
        .returning();
      
      return newHour;
    }
  }
  
  async getHourlyTraffic(storeId: number, hours: number = 24): Promise<HourlyTraffic[]> {
    const cutoffTime = subHours(new Date(), hours);
    
    return await db.select()
      .from(hourlyTraffic)
      .where(
        and(
          eq(hourlyTraffic.store_id, storeId),
          gte(hourlyTraffic.hour_start, cutoffTime)
        )
      )
      .orderBy(hourlyTraffic.hour_start);
  }
  
  // Stats methods
  async getCurrentStats(storeId: number): Promise<StoreStats> {
    // Return from cache
    return this.storeStats.get(storeId) || {
      currentCustomers: 0,
      customersInToday: 0,
      customersOutToday: 0,
      lastUpdated: format(new Date(), 'HH:mm:ss')
    };
  }
  
  async getHistoricalStats(storeId: number): Promise<HistoricalStats> {
    const hourlyData = await this.getHourlyTraffic(storeId);
    
    // Default values if no data
    if (hourlyData.length === 0) {
      return {
        totalVisitors24h: 0,
        peakHour: "00:00 - 01:00",
        peakHourCount: 0,
        slowestHour: "00:00 - 01:00",
        slowestHourCount: 0
      };
    }
    
    // Calculate total visitors
    const totalVisitors24h = hourlyData.reduce((sum, hour) => sum + hour.customers_in, 0);
    
    // Find peak hour and slowest hour
    let peakHour = hourlyData[0];
    let slowestHour = hourlyData[0];
    
    for (const hour of hourlyData) {
      if (hour.customers_in > peakHour.customers_in) {
        peakHour = hour;
      }
      if (hour.customers_in < slowestHour.customers_in) {
        slowestHour = hour;
      }
    }
    
    const peakHourStr = format(peakHour.hour_start, 'HH:00') + ' - ' + 
                        format(endOfHour(peakHour.hour_start), 'HH:00');
    const slowestHourStr = format(slowestHour.hour_start, 'HH:00') + ' - ' + 
                           format(endOfHour(slowestHour.hour_start), 'HH:00');
    
    return {
      totalVisitors24h,
      peakHour: peakHourStr,
      peakHourCount: peakHour.customers_in,
      slowestHour: slowestHourStr,
      slowestHourCount: slowestHour.customers_in
    };
  }
  
  // Process a Kafka message
  async processKafkaMessage(message: KafkaMessage): Promise<void> {
    const { store_id, customers_in, customers_out, time_stamp } = message;
    
    // Parse timestamp
    const now = new Date();
    const [hours, minutes, seconds] = time_stamp.split('.').map(Number);
    const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
    
    // Create store event with explicit values to avoid TypeScript errors
    const storeEvent: InsertStoreEvent = {
      store_id,
      customers_in,
      customers_out,
      timestamp
    };
    
    // Save the event
    await this.saveStoreEvent(storeEvent);
    
    // Update current stats
    const currentStats = await this.getCurrentStats(store_id);
    const netChange = customers_in - customers_out;
    
    // Update stats
    const updatedStats: StoreStats = {
      currentCustomers: Math.max(0, currentStats.currentCustomers + netChange),
      customersInToday: currentStats.customersInToday + customers_in,
      customersOutToday: currentStats.customersOutToday + customers_out,
      lastUpdated: time_stamp
    };
    
    this.storeStats.set(store_id, updatedStats);
    
    // Update hourly traffic
    const hourStart = startOfHour(timestamp);
    
    // Create or update hourly traffic record with explicitly defined values
    const hourlyData: InsertHourlyTraffic = {
      store_id,
      hour_start: hourStart,
      customers_in,
      customers_out,
      net_flow: netChange,
      ending_count: updatedStats.currentCustomers
    };
    
    await this.saveHourlyTraffic(hourlyData);
  }
  
  // Initialize with seed data if needed
  async initializeStore(storeId: number): Promise<void> {
    // Check if we already have data for this store
    const existingEvents = await this.getRecentEvents(storeId, 1);
    
    if (existingEvents.length === 0) {
      // Generate seed data for the store
      await this.generateInitialHourlyData(storeId);
    }
  }
  
  // Generate initial hourly data for the last 24 hours
  private async generateInitialHourlyData(storeId: number): Promise<void> {
    let runningTotal = 0;
    
    for (let i = 24; i >= 1; i--) {
      const hourStart = subHours(new Date(), i);
      // Generate random data that follows typical store traffic patterns
      const hour = hourStart.getHours();
      
      let customersIn = 0;
      let customersOut = 0;
      
      if (hour >= 6 && hour < 10) {
        // Morning rush - more coming in
        customersIn = Math.floor(Math.random() * 15) + 5;
        customersOut = Math.floor(Math.random() * 5);
      } else if (hour >= 10 && hour < 15) {
        // Midday - busy both ways
        customersIn = Math.floor(Math.random() * 20) + 15;
        customersOut = Math.floor(Math.random() * 20) + 10;
      } else if (hour >= 15 && hour < 20) {
        // Evening - more going out
        customersIn = Math.floor(Math.random() * 15) + 5;
        customersOut = Math.floor(Math.random() * 20) + 10;
      } else {
        // Night - very low traffic
        customersIn = Math.floor(Math.random() * 3);
        customersOut = Math.floor(Math.random() * 5);
      }
      
      const netFlow = customersIn - customersOut;
      runningTotal += netFlow;
      
      if (runningTotal < 0) runningTotal = 0;
      
      // Save hourly data
      await db.insert(hourlyTraffic).values({
        store_id: storeId,
        hour_start: hourStart,
        customers_in: customersIn,
        customers_out: customersOut,
        net_flow: netFlow,
        ending_count: Math.max(0, runningTotal)
      });
    }
    
    // Set current store stats
    this.storeStats.set(storeId, {
      currentCustomers: Math.max(0, runningTotal),
      customersInToday: 0,
      customersOutToday: 0,
      lastUpdated: format(new Date(), 'HH:mm:ss')
    });
  }
}

export const storage = new DatabaseStorage();
