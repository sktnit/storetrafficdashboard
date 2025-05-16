import { Kafka, Producer, Consumer, KafkaMessage as KafkaClientMessage } from 'kafkajs';
import { KafkaMessage } from '@shared/schema';
import { storage } from './storage';
import { broadcastToStore } from './routes';

// Kafka configuration
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'store-traffic-dashboard';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'store-traffic';
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'store-traffic-group';

// Flag to track if Kafka is enabled and connected
let kafkaConnected = false;
let producer: Producer | null = null;
let consumer: Consumer | null = null;

/**
 * Initialize Kafka connections
 */
export async function initializeKafka(): Promise<boolean> {
  if (process.env.KAFKA_ENABLED !== 'true') {
    console.log('Kafka not enabled in environment, skipping initialization');
    return false;
  }

  try {
    console.log('Connecting to Kafka brokers:', KAFKA_BROKERS);
    
    // Initialize Kafka client
    const kafka = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: KAFKA_BROKERS,
      connectionTimeout: 5000,
      retry: {
        initialRetryTime: 300,
        retries: 5
      }
    });

    // Create producer and consumer
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
    
    // Connect producer and consumer
    await producer.connect();
    await consumer.connect();
    
    // Subscribe to the topic
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
    
    console.log('Kafka connected successfully!');
    kafkaConnected = true;
    
    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (message.value) {
            const messageValue = message.value.toString();
            const data = JSON.parse(messageValue) as KafkaMessage;
    
            // Process message through storage
            await storage.processKafkaMessage(data);
    
            // Broadcast to connected clients
            broadcastToStore(data.store_id, {
              type: 'KAFKA_MESSAGE',
              payload: data
            });
    
            // ✅ This is the correct place for the log
            console.log(`Processed Kafka message: ${data.store_id} - in: ${data.customers_in}, out: ${data.customers_out}`);
          }
        } catch (err) {
          console.error('Error processing Kafka message:', err);
        }
      },
    });
    
    return true;
  } catch (err) {
    console.error('Failed to initialize Kafka:', err);
    return false;
  }
}

/**
 * Send a message to Kafka topic
 */
export async function sendKafkaMessage(message: KafkaMessage): Promise<void> {
  if (!kafkaConnected || !producer) {
    console.log(`Processing message locally for store ${message.store_id} (Kafka not connected)`);
    // If Kafka is not connected, just process the message locally
    await storage.processKafkaMessage(message);
    
    // Broadcast to connected clients
    broadcastToStore(message.store_id, {
      type: 'KAFKA_MESSAGE',
      payload: message
    });
    return;
  }
  
  try {
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [
        { value: JSON.stringify(message) },
      ],
    });
    console.log(`✅ Sent Kafka message to topic "${KAFKA_TOPIC}":`, message);
  } catch (err) {
    console.error('Failed to send Kafka message:', err);
    
    // Even if Kafka send fails, still process message locally
    await storage.processKafkaMessage(message);
    
    // Broadcast to connected clients
    broadcastToStore(message.store_id, {
      type: 'KAFKA_MESSAGE',
      payload: message
    });
  }
}

/**
 * Disconnect from Kafka
 */
export async function disconnectKafka(): Promise<void> {
  if (!kafkaConnected) return;
  
  try {
    if (consumer) await consumer.disconnect();
    if (producer) await producer.disconnect();
    console.log('Disconnected from Kafka');
    kafkaConnected = false;
  } catch (err) {
    console.error('Error disconnecting from Kafka:', err);
  }
}

/**
 * Generate simulated Kafka messages
 */
export function generateTestEvents(): void {
  console.log('Starting simulated traffic event generation...');
  
  // Simulate messages for stores 10, 11, and 12
  const storeIds = [10, 11, 12];
  
  setInterval(() => {
    const storeId = storeIds[Math.floor(Math.random() * storeIds.length)];
    const customersIn = Math.floor(Math.random() * 3); // 0-2 customers in
    const customersOut = Math.floor(Math.random() * 3); // 0-2 customers out
    
    // Only send message if there's actual movement
    if (customersIn > 0 || customersOut > 0) {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const timeStamp = `${hours}.${minutes}.${seconds}`;
      
      const kafkaMessage: KafkaMessage = {
        store_id: storeId,
        customers_in: customersIn,
        customers_out: customersOut,
        time_stamp: timeStamp
      };
      
      // Process the message directly
      storage.processKafkaMessage(kafkaMessage)
        .then(() => {
          // Broadcast to connected clients
          broadcastToStore(storeId, {
            type: 'KAFKA_MESSAGE',
            payload: kafkaMessage
          });
        })
        .catch(err => console.error('Error processing simulated message:', err));
    }
  }, 5000); // Generate a message every 5 seconds
}