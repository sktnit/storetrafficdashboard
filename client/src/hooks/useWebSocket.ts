import { useState, useEffect, useRef } from "react";
import { KafkaMessage, StoreEvent, StoreStats, HistoricalStats, HourlyTraffic } from "@shared/schema";

interface WebSocketData {
  connected: boolean;
  currentStats: StoreStats;
  recentEvents: StoreEvent[];
  historicalStats: HistoricalStats;
  hourlyTraffic: HourlyTraffic[];
}

export default function useWebSocket(storeId: number): WebSocketData {
  const [connected, setConnected] = useState(false);
  const [currentStats, setCurrentStats] = useState<StoreStats>({
    currentCustomers: 0,
    customersInToday: 0,
    customersOutToday: 0,
    lastUpdated: "00:00:00",
  });
  const [recentEvents, setRecentEvents] = useState<StoreEvent[]>([]);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats>({
    totalVisitors24h: 0,
    peakHour: "00:00 - 01:00",
    peakHourCount: 0,
    slowestHour: "00:00 - 01:00",
    slowestHourCount: 0,
  });
  const [hourlyTraffic, setHourlyTraffic] = useState<HourlyTraffic[]>([]);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clean up previous connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Set up WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
      setConnected(true);
      console.log("WebSocket connected");
      
      // Subscribe to the store
      socket.send(JSON.stringify({
        type: "SUBSCRIBE",
        storeId: storeId,
      }));
    };
    
    socket.onclose = () => {
      setConnected(false);
      console.log("WebSocket disconnected");
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log("Attempting to reconnect...");
        socketRef.current = null;
      }, 3000);
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      socket.close();
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "INITIAL_DATA") {
          // Process initial data
          setCurrentStats(data.payload.currentStats);
          setRecentEvents(data.payload.recentEvents);
          setHistoricalStats(data.payload.historicalStats);
          setHourlyTraffic(data.payload.hourlyTraffic);
        } 
        else if (data.type === "KAFKA_MESSAGE") {
          // Process Kafka message
          const message: KafkaMessage = data.payload;
          
          if (message.store_id === storeId) {
            // Update current stats
            setCurrentStats(prevStats => {
              const netChange = message.customers_in - message.customers_out;
              return {
                currentCustomers: Math.max(0, prevStats.currentCustomers + netChange),
                customersInToday: prevStats.customersInToday + message.customers_in,
                customersOutToday: prevStats.customersOutToday + message.customers_out,
                lastUpdated: message.time_stamp,
              };
            });
            
            // Update recent events
            const timestamp = new Date();
            const [hours, minutes, seconds] = message.time_stamp.split('.').map(Number);
            timestamp.setHours(hours, minutes, seconds);
            
            const newEvent: StoreEvent = {
              id: Date.now(), // Temporary ID for UI purposes
              store_id: message.store_id,
              customers_in: message.customers_in,
              customers_out: message.customers_out,
              timestamp,
            };
            
            setRecentEvents(prevEvents => [newEvent, ...prevEvents.slice(0, 9)]);
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [storeId]);
  
  return {
    connected,
    currentStats,
    recentEvents,
    historicalStats,
    hourlyTraffic,
  };
}
