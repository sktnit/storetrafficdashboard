import { Kafka, Producer, Consumer, KafkaMessage as KafkaClientMessage } from 'kafkajs';
import { KafkaMessage } from '@shared/schema';
import { storage } from './storage';

// Kafka configuration
const KAFKA_BROKERS = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'store-traffic-dashboard';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'store-traffic';
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'store-traffic-group';

// Initialize Kafka client
const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
});

// Create producer and consumer
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

/**
 * Initialize Kafka connections
 */
export async function initializeKafka(): Promise<void> {
  try {
    console.log('Connecting to Kafka...');
    
    // Connect producer and consumer
    await producer.connect();
    await consumer.connect();
    
    // Subscribe to the topic
    await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
    
    console.log('Kafka connected successfully!');
    
    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (message.value) {
            const messageValue = message.value.toString();
            const data = JSON.parse(messageValue) as KafkaMessage;
            
            // Process message through storage
            await storage.processKafkaMessage(data);
            
            // Log successful processing
            console.log(`Processed Kafka message: ${data.store_id} - in: ${data.customers_in}, out: ${data.customers_out}`);
          }
        } catch (err) {
          console.error('Error processing Kafka message:', err);
        }
      },
    });
  } catch (err) {
    console.error('Failed to initialize Kafka:', err);
    fallbackToSimulation();
  }
}

/**
 * Send a message to Kafka topic
 */
export async function sendKafkaMessage(message: KafkaMessage): Promise<void> {
  try {
    await producer.send({
      topic: KAFKA_TOPIC,
      messages: [
        { value: JSON.stringify(message) },
      ],
    });
  } catch (err) {
    console.error('Failed to send Kafka message:', err);
  }
}

/**
 * Disconnect from Kafka
 */
export async function disconnectKafka(): Promise<void> {
  try {
    await consumer.disconnect();
    await producer.disconnect();
    console.log('Disconnected from Kafka');
  } catch (err) {
    console.error('Error disconnecting from Kafka:', err);
  }
}

/**
 * Fallback to simulated Kafka messages when real Kafka is not available
 */
function fallbackToSimulation(): void {
  console.log('Falling back to simulated Kafka messages...');
  
  // Simulate Kafka messages
  setInterval(() => {
    // Generate random store ID (10, 11, or 12)
    const storeId = 10 + Math.floor(Math.random() * 3);
    
    // Generate random customer flow (0-2 customers)
    const customersIn = Math.floor(Math.random() * 3);
    const customersOut = Math.floor(Math.random() * 3);
    
    // Only send message if there's actual movement
    if (customersIn > 0 || customersOut > 0) {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const timeStamp = `${hours}.${minutes}.${seconds}`;
      
      // Create message
      const message: KafkaMessage = {
        store_id: storeId,
        customers_in: customersIn,
        customers_out: customersOut,
        time_stamp: timeStamp
      };
      
      // Process message
      storage.processKafkaMessage(message)
        .catch(err => console.error('Error processing simulated message:', err));
    }
  }, 5000); // Generate a message every 5 seconds
}