import { useState, useEffect, useRef } from "react";
import LiveEventsTable from "@/components/LiveEventsTable";
import { StoreEvent, StoreStats } from "@shared/schema";
import { format, subMinutes } from "date-fns";

interface LiveViewProps {
  currentStats: StoreStats;
  recentEvents: StoreEvent[];
}

export default function LiveView({
  currentStats,
  recentEvents,
}: LiveViewProps) {
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
      fill: boolean;
    }[];
  }>({
    labels: [],
    datasets: [
      {
        label: "Customers In",
        data: [],
        borderColor: "hsl(142 71% 45%)",
        backgroundColor: "hsla(142 71% 45% / 0.1)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Customers Out",
        data: [],
        borderColor: "hsl(0 100% 65%)",
        backgroundColor: "hsla(0 100% 65% / 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  });

  // Update chart when recentEvents changes
  console.log("LiveView currentStats", currentStats);
  console.log("LiveView recentEvents", recentEvents);
  useEffect(() => {
    if (recentEvents.length > 0) {
      // Create data for the last 30 minutes (5-minute intervals)
      const now = new Date();
      const timeIntervals = [];
      const customersInData = [];
      const customersOutData = [];

      // Create 7 time intervals (5 minutes each)
      for (let i = 6; i >= 0; i--) {
        const intervalTime = subMinutes(now, i * 5);
        timeIntervals.push(format(intervalTime, "HH:mm"));

        // Find events in this interval
        const eventsInInterval = recentEvents.filter((event) => {
          const eventTime = new Date(event.timestamp);
          const intervalStart = subMinutes(intervalTime, 5);
          return eventTime >= intervalStart && eventTime <= intervalTime;
        });

        // Sum customers in/out for this interval
        const customersIn = eventsInInterval.reduce(
          (sum, event) => sum + event.customers_in,
          0
        );
        const customersOut = eventsInInterval.reduce(
          (sum, event) => sum + event.customers_out,
          0
        );

        customersInData.push(customersIn);
        customersOutData.push(customersOut);
      }

      setChartData({
        labels: timeIntervals,
        datasets: [
          {
            ...chartData.datasets[0],
            data: customersInData,
          },
          {
            ...chartData.datasets[1],
            data: customersOutData,
          },
        ],
      });
    }
  }, [recentEvents]);

  return (
    <div className="space-y-6">
      {/* Live Events Table */}
      <LiveEventsTable events={recentEvents} />
    </div>
  );
}
