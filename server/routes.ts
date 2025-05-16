import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { format } from "date-fns";
import { KafkaMessage } from "@shared/schema";

// Store connected clients
const clients: Map<number, WebSocket[]> = new Map();

// Function to broadcast message to all clients for a specific store
function broadcastToStore(storeId: number, message: any): void {
  const storeClients = clients.get(storeId) || [];
  const messageStr = JSON.stringify(message);
  
  storeClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Function to simulate Kafka messages
function simulateKafkaMessages(): void {
  // Simulate messages for stores 10, 11, and 12
  const storeIds = [10, 11, 12];
  
  setInterval(() => {
    const storeId = storeIds[Math.floor(Math.random() * storeIds.length)];
    const customersIn = Math.floor(Math.random() * 3); // 0-2 customers in
    const customersOut = Math.floor(Math.random() * 3); // 0-2 customers out
    
    // Only send message if there's actual movement
    if (customersIn > 0 || customersOut > 0) {
      const now = new Date();
      const timeStamp = format(now, 'HH.mm.ss');
      
      const kafkaMessage: KafkaMessage = {
        store_id: storeId,
        customers_in: customersIn,
        customers_out: customersOut,
        time_stamp: timeStamp
      };
      
      // Process the message in storage
      storage.processKafkaMessage(kafkaMessage)
        .then(() => {
          // Broadcast to connected clients for this store
          broadcastToStore(storeId, {
            type: 'KAFKA_MESSAGE',
            payload: kafkaMessage
          });
        })
        .catch(console.error);
    }
  }, 5000); // Generate a message every 5 seconds
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server on a specific path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket connection handler
  wss.on('connection', (ws) => {
    let clientStoreId = 10; // Default store ID
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle subscribe to a store
        if (data.type === 'SUBSCRIBE') {
          const storeId = parseInt(data.storeId, 10);
          clientStoreId = storeId;
          
          // Add client to the store's client list
          if (!clients.has(storeId)) {
            clients.set(storeId, []);
          }
          clients.get(storeId)?.push(ws);
          
          // Send initial data to the client
          Promise.all([
            storage.getCurrentStats(storeId),
            storage.getRecentEvents(storeId, 10),
            storage.getHistoricalStats(storeId),
            storage.getHourlyTraffic(storeId)
          ])
            .then(([currentStats, recentEvents, historicalStats, hourlyTraffic]) => {
              ws.send(JSON.stringify({
                type: 'INITIAL_DATA',
                payload: {
                  currentStats,
                  recentEvents,
                  historicalStats,
                  hourlyTraffic
                }
              }));
            })
            .catch(console.error);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      // Remove client from store's client list
      const storeClients = clients.get(clientStoreId) || [];
      const index = storeClients.indexOf(ws);
      if (index !== -1) {
        storeClients.splice(index, 1);
      }
      clients.set(clientStoreId, storeClients);
    });
  });
  
  // Start simulating Kafka messages
  simulateKafkaMessages();
  
  // API endpoints
  
  // Get current stats for a store
  app.get('/api/stats/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId, 10);
    const stats = await storage.getCurrentStats(storeId);
    res.json(stats);
  });
  
  // Get recent events for a store
  app.get('/api/events/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId, 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const events = await storage.getRecentEvents(storeId, limit);
    res.json(events);
  });
  
  // Get historical stats for a store
  app.get('/api/historical/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId, 10);
    const stats = await storage.getHistoricalStats(storeId);
    res.json(stats);
  });
  
  // Get hourly traffic for a store
  app.get('/api/hourly/:storeId', async (req, res) => {
    const storeId = parseInt(req.params.storeId, 10);
    const hours = parseInt(req.query.hours as string || '24', 10);
    const hourlyData = await storage.getHourlyTraffic(storeId, hours);
    res.json(hourlyData);
  });

  return httpServer;
}
