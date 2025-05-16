# Store Traffic Dashboard

A real-time customer tracking dashboard that displays store traffic data using WebSockets and Kafka messages (simulated).

## Features

- **Real-time Updates**: See customer entry and exit events as they happen
- **Live View**: Current store status and recent events
- **Historical View**: Hourly traffic data for the last 24 hours
- **Interactive Charts**: Visualize traffic patterns
- **Multiple Store Support**: Switch between different store locations
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Chart.js
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Real-time Communication**: WebSockets
- **UI Components**: Shadcn UI

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

The application will be available at http://localhost:5000

## Dashboard Overview

### Live View
- Shows current number of customers in the store
- Displays today's entry and exit counts
- Provides a real-time chart of traffic in 5-minute intervals
- Lists recent entry/exit events

### Historical View
- Shows total visitors in the last 24 hours
- Identifies peak and slowest hours
- Provides a bar chart showing hourly traffic
- Includes a paginated table of hourly data

## Implementation Details

### Data Flow
1. Kafka messages (simulated) report customer entries and exits
2. Backend processes these events and updates statistics
3. WebSocket sends updates to connected clients
4. Frontend displays the data in real-time

### Database Schema
- `users`: Authentication data (unused in this demo)
- `store_events`: Individual customer entry/exit events
- `hourly_traffic`: Aggregated hourly traffic statistics

## Customization

You can modify the following to extend the application:

- Add additional store locations in the header component
- Implement authentication using the existing user schema
- Create additional visualizations using the existing data