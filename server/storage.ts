import { 
  users, 
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
import { format, subHours, parse, startOfHour, endOfHour, compareAsc, isSameDay } from "date-fns";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private storeEvents: Map<number, StoreEvent[]>;
  private hourlyTraffic: Map<number, HourlyTraffic[]>;
  private storeStats: Map<number, StoreStats>;
  
  currentId: number;
  hourlyId: number;
  eventId: number;

  constructor() {
    this.users = new Map();
    this.storeEvents = new Map();
    this.hourlyTraffic = new Map();
    this.storeStats = new Map();
    
    this.currentId = 1;
    this.hourlyId = 1;
    this.eventId = 1;
    
    // Initialize with empty data for store ID 10
    this.storeEvents.set(10, []);
    this.hourlyTraffic.set(10, this.generateInitialHourlyData(10));
    this.storeStats.set(10, {
      currentCustomers: 0,
      customersInToday: 0,
      customersOutToday: 0,
      lastUpdated: format(new Date(), 'HH:mm:ss')
    });
    
    // Add store 11 and 12 for store selector
    this.storeEvents.set(11, []);
    this.hourlyTraffic.set(11, this.generateInitialHourlyData(11));
    this.storeStats.set(11, {
      currentCustomers: 0,
      customersInToday: 0,
      customersOutToday: 0,
      lastUpdated: format(new Date(), 'HH:mm:ss')
    });
    
    this.storeEvents.set(12, []);
    this.hourlyTraffic.set(12, this.generateInitialHourlyData(12));
    this.storeStats.set(12, {
      currentCustomers: 0,
      customersInToday: 0,
      customersOutToday: 0,
      lastUpdated: format(new Date(), 'HH:mm:ss')
    });
  }
  
  // Generate initial hourly data for the last 24 hours
  private generateInitialHourlyData(storeId: number): HourlyTraffic[] {
    const hourlyData: HourlyTraffic[] = [];
    let runningTotal = 0;
    
    for (let i = 24; i >= 1; i--) {
      const hourStart = subHours(new Date(), i);
      // Generate random data that follows typical store traffic patterns
      // Morning: increasing, Midday: peak, Evening: decreasing, Night: low
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
      
      hourlyData.push({
        id: this.hourlyId++,
        store_id: storeId,
        hour_start: hourStart,
        customers_in: customersIn,
        customers_out: customersOut,
        net_flow: netFlow,
        ending_count: runningTotal
      });
    }
    
    return hourlyData;
  }

  // User methods (from original file)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Store event methods
  async saveStoreEvent(event: InsertStoreEvent): Promise<StoreEvent> {
    const id = this.eventId++;
    const storeEvent: StoreEvent = { ...event, id };
    
    if (!this.storeEvents.has(event.store_id)) {
      this.storeEvents.set(event.store_id, []);
    }
    
    const events = this.storeEvents.get(event.store_id) || [];
    events.unshift(storeEvent); // Add to beginning for recent-first order
    
    // Keep only the latest 100 events per store
    if (events.length > 100) {
      events.pop();
    }
    
    this.storeEvents.set(event.store_id, events);
    return storeEvent;
  }
  
  async getRecentEvents(storeId: number, limit: number): Promise<StoreEvent[]> {
    const events = this.storeEvents.get(storeId) || [];
    return events.slice(0, limit);
  }
  
  // Hourly traffic methods
  async saveHourlyTraffic(hourlyData: InsertHourlyTraffic): Promise<HourlyTraffic> {
    const id = this.hourlyId++;
    const hourly: HourlyTraffic = { ...hourlyData, id };
    
    if (!this.hourlyTraffic.has(hourlyData.store_id)) {
      this.hourlyTraffic.set(hourlyData.store_id, []);
    }
    
    const hourlyTrafficData = this.hourlyTraffic.get(hourlyData.store_id) || [];
    
    // Check if we already have data for this hour
    const existingIndex = hourlyTrafficData.findIndex(
      (item) => format(item.hour_start, 'yyyy-MM-dd HH') === format(hourlyData.hour_start, 'yyyy-MM-dd HH')
    );
    
    if (existingIndex !== -1) {
      // Update existing record
      hourlyTrafficData[existingIndex] = {
        ...hourlyTrafficData[existingIndex],
        customers_in: hourlyTrafficData[existingIndex].customers_in + hourlyData.customers_in,
        customers_out: hourlyTrafficData[existingIndex].customers_out + hourlyData.customers_out,
        net_flow: hourlyTrafficData[existingIndex].net_flow + hourlyData.net_flow,
        ending_count: hourlyData.ending_count
      };
    } else {
      // Add new record
      hourlyTrafficData.push(hourly);
      
      // Sort by hour_start in descending order (newest first)
      hourlyTrafficData.sort((a, b) => 
        compareAsc(b.hour_start, a.hour_start)
      );
      
      // Keep only the latest 24 hours
      if (hourlyTrafficData.length > 24) {
        hourlyTrafficData.pop();
      }
    }
    
    this.hourlyTraffic.set(hourlyData.store_id, hourlyTrafficData);
    return hourly;
  }
  
  async getHourlyTraffic(storeId: number, hours: number = 24): Promise<HourlyTraffic[]> {
    const hourlyData = this.hourlyTraffic.get(storeId) || [];
    
    // Sort by hour_start in ascending order for display (oldest first)
    return [...hourlyData]
      .sort((a, b) => compareAsc(a.hour_start, b.hour_start))
      .slice(-hours);
  }
  
  // Stats methods
  async getCurrentStats(storeId: number): Promise<StoreStats> {
    return this.storeStats.get(storeId) || {
      currentCustomers: 0,
      customersInToday: 0,
      customersOutToday: 0,
      lastUpdated: format(new Date(), 'HH:mm:ss')
    };
  }
  
  async getHistoricalStats(storeId: number): Promise<HistoricalStats> {
    const hourlyData = await this.getHourlyTraffic(storeId);
    
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
    
    // Create store event
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
    const hourlyTrafficData = this.hourlyTraffic.get(store_id) || [];
    
    // Find the current hour's data
    const currentHourIndex = hourlyTrafficData.findIndex(
      (item) => format(item.hour_start, 'yyyy-MM-dd HH') === format(hourStart, 'yyyy-MM-dd HH')
    );
    
    if (currentHourIndex !== -1) {
      // Update existing hour data
      const currentHour = hourlyTrafficData[currentHourIndex];
      const updatedHour: InsertHourlyTraffic = {
        store_id,
        hour_start: currentHour.hour_start,
        customers_in: currentHour.customers_in + customers_in,
        customers_out: currentHour.customers_out + customers_out,
        net_flow: currentHour.net_flow + netChange,
        ending_count: updatedStats.currentCustomers
      };
      
      await this.saveHourlyTraffic(updatedHour);
    } else {
      // Create new hour data
      const newHour: InsertHourlyTraffic = {
        store_id,
        hour_start: hourStart,
        customers_in: customers_in,
        customers_out: customers_out,
        net_flow: netChange,
        ending_count: updatedStats.currentCustomers
      };
      
      await this.saveHourlyTraffic(newHour);
    }
  }
}

export const storage = new MemStorage();
