# Store Traffic Dashboard

A real-time customer tracking dashboard that displays store traffic data using WebSockets and Kafka messages (simulated).

## Features

- **Real-time Updates**: See customer entry and exit events as they happen
- **Live View**: Current store status and recent events
- **Historical View**: Hourly traffic data for the last 24 hours

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Chart.js
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Real-time Communication**: WebSockets

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn
- PostgreSQL database

### Environment Setup

1. Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

2. Install dependencies:

```bash
npm install
```

3. Initialize the database:

```bash
npm run db:push
```

### Running the Application

To start the development server:

```bash
npm run dev
```

4. Kafka Producer command:
   echo '{"store_id": 10, "customers_in": 2, "customers_out": 1, "time_stamp": "12.30.00"}' | \
   /opt/homebrew/Cellar/kafka/4.0.0/libexec/bin/kafka-console-producer.sh \
   --bootstrap-server localhost:9092 --topic store-traffic

The application will be available at http://localhost:5001

## Dashboard Overview

### View

- Live Data tab: It will show the customers coming in and out of the store in real time
- Historical Data tab: It will show the customers coming in and out of the store per hour for
  the last 24 hrs.

## Implementation Details

### Data Flow

1. Kafka messages (simulated) report customer entries and exits
2. Backend processes these events and updates statistics
3. WebSocket sends updates to connected clients
4. Frontend displays the data in real-time

### Database Schema

- `store_events`: Individual customer entry/exit events
- `hourly_traffic`: Aggregated hourly traffic statistics

## Customization

You can modify the following to extend the application:

- Add additional store locations in the header component
- Implement authentication using the existing user schema
- Create additional visualizations using the existing data
