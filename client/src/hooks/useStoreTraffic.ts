import { useQuery } from "@tanstack/react-query";
import { StoreStats, StoreEvent, HistoricalStats, HourlyTraffic } from "@shared/schema";

export function useCurrentStats(storeId: number) {
  return useQuery<StoreStats>({
    queryKey: [`/api/stats/${storeId}`],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useRecentEvents(storeId: number, limit: number = 10) {
  return useQuery<StoreEvent[]>({
    queryKey: [`/api/events/${storeId}?limit=${limit}`],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useHistoricalStats(storeId: number) {
  return useQuery<HistoricalStats>({
    queryKey: [`/api/historical/${storeId}`],
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useHourlyTraffic(storeId: number, hours: number = 24) {
  return useQuery<HourlyTraffic[]>({
    queryKey: [`/api/hourly/${storeId}?hours=${hours}`],
    refetchInterval: 60000, // Refresh every minute
  });
}
