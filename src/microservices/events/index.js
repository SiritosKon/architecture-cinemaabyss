const express = require('express');
const { Kafka } = require('kafkajs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8082;
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'cinemaabyss-events',
  brokers: KAFKA_BROKERS,
  retry: { initialRetryTime: 3000, retries: 30 },
});

const producer = kafka.producer();
let producerReady = false;

async function connectProducer() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await producer.connect();
      producerReady = true;
      console.log('Kafka producer connected');
      return;
    } catch (err) {
      console.log(`Waiting for Kafka... attempt ${attempt}/30: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error('Could not connect Kafka producer after 30 attempts');
}

async function startConsumer() {
  const consumer = kafka.consumer({ groupId: 'cinemaabyss-events-group' });

  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await consumer.connect();
      console.log('Kafka consumer connected');
      break;
    } catch (err) {
      console.log(`Consumer waiting for Kafka... attempt ${attempt}/30: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
      if (attempt === 30) {
        console.error('Could not connect Kafka consumer after 30 attempts');
        return;
      }
    }
  }

  await consumer.subscribe({ topics: ['movie-events', 'user-events', 'payment-events'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value.toString();
      console.log(`[consumer] topic=${topic} partition=${partition} offset=${message.offset} value=${value}`);
    },
  });
}

async function publishEvent(topic, event) {
  if (!producerReady) {
    throw new Error('Kafka producer is not ready');
  }

  const messages = [{ value: JSON.stringify(event) }];
  const result = await producer.send({ topic, messages });

  const { partition, baseOffset } = result[0];
  return { partition, offset: parseInt(baseOffset, 10) };
}

app.get('/api/events/health', (_req, res) => {
  res.json({ status: true });
});

app.post('/api/events/movie', async (req, res) => {
  try {
    const event = req.body;
    const { partition, offset } = await publishEvent('movie-events', event);
    console.log(`[producer] movie-events partition=${partition} offset=${offset}`);
    res.status(201).json({ status: 'success', partition, offset, event });
  } catch (err) {
    console.error('Error publishing movie event:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/user', async (req, res) => {
  try {
    const event = req.body;
    const { partition, offset } = await publishEvent('user-events', event);
    console.log(`[producer] user-events partition=${partition} offset=${offset}`);
    res.status(201).json({ status: 'success', partition, offset, event });
  } catch (err) {
    console.error('Error publishing user event:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/payment', async (req, res) => {
  try {
    const event = req.body;
    const { partition, offset } = await publishEvent('payment-events', event);
    console.log(`[producer] payment-events partition=${partition} offset=${offset}`);
    res.status(201).json({ status: 'success', partition, offset, event });
  } catch (err) {
    console.error('Error publishing payment event:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function main() {
  await connectProducer();
  startConsumer().catch((err) => console.error('Consumer error:', err));

  app.listen(PORT, () => {
    console.log(`Events service listening on port ${PORT}`);
  });
}

main().catch(console.error);
