import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (keep this from original file)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Store traffic event schema
export const storeEvents = pgTable("store_events", {
  id: serial("id").primaryKey(),
  store_id: integer("store_id").notNull(),
  customers_in: integer("customers_in").notNull().default(0),
  customers_out: integer("customers_out").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertStoreEventSchema = createInsertSchema(storeEvents).pick({
  store_id: true,
  customers_in: true,
  customers_out: true,
  timestamp: true,
});

export type InsertStoreEvent = z.infer<typeof insertStoreEventSchema>;
export type StoreEvent = typeof storeEvents.$inferSelect;

// Hourly aggregate schema
export const hourlyTraffic = pgTable("hourly_traffic", {
  id: serial("id").primaryKey(),
  store_id: integer("store_id").notNull(),
  hour_start: timestamp("hour_start").notNull(),
  customers_in: integer("customers_in").notNull().default(0),
  customers_out: integer("customers_out").notNull().default(0),
  net_flow: integer("net_flow").notNull().default(0),
  ending_count: integer("ending_count").notNull().default(0),
});

export const insertHourlyTrafficSchema = createInsertSchema(hourlyTraffic).pick({
  store_id: true,
  hour_start: true,
  customers_in: true,
  customers_out: true,
  net_flow: true,
  ending_count: true,
});

export type InsertHourlyTraffic = z.infer<typeof insertHourlyTrafficSchema>;
export type HourlyTraffic = typeof hourlyTraffic.$inferSelect;

// Kafka message type
export interface KafkaMessage {
  store_id: number;
  customers_in: number;
  customers_out: number;
  time_stamp: string;
}

// Store stats type
export interface StoreStats {
  currentCustomers: number;
  customersInToday: number;
  customersOutToday: number;
  lastUpdated: string;
}

// Historical stats type
export interface HistoricalStats {
  totalVisitors24h: number;
  peakHour: string;
  peakHourCount: number;
  slowestHour: string;
  slowestHourCount: number;
}
