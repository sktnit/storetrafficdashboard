import { useState, useEffect, useRef } from "react";
import StatCard from "@/components/StatCard";
import LiveEventsTable from "@/components/LiveEventsTable";
import { Chart } from "@/components/ui/chart";
import { StoreEvent, StoreStats } from "@shared/schema";
import { format, subMinutes } from "date-fns";

interface LiveViewProps {
  currentStats: StoreStats;
  recentEvents: StoreEvent[];
}

export default function LiveView({ currentStats, recentEvents }: LiveViewProps) {
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
        const eventsInInterval = recentEvents.filter(event => {
          const eventTime = new Date(event.timestamp);
          const intervalStart = subMinutes(intervalTime, 5);
          return eventTime >= intervalStart && eventTime <= intervalTime;
        });

        // Sum customers in/out for this interval
        const customersIn = eventsInInterval.reduce((sum, event) => sum + event.customers_in, 0);
        const customersOut = eventsInInterval.reduce((sum, event) => sum + event.customers_out, 0);

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
      {/* Current Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Current In Store"
          value={currentStats.currentCustomers.toString()}
          colorClass="border-primary"
        />
        <StatCard
          title="Customers In (Today)"
          value={currentStats.customersInToday.toString()}
          colorClass="border-success"
        />
        <StatCard
          title="Customers Out (Today)"
          value={currentStats.customersOutToday.toString()}
          colorClass="border-error"
        />
        <StatCard
          title="Last Updated"
          value={currentStats.lastUpdated}
          colorClass="border-gray-500"
        />
      </div>

      {/* Real-Time Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Real-Time Customer Flow
        </h2>
        <div className="h-64">
          <Chart
            type="line"
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                  },
                },
              },
              plugins: {
                legend: {
                  position: "top",
                },
                tooltip: {
                  mode: "index",
                  intersect: false,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Live Events Table */}
      <LiveEventsTable events={recentEvents} />
    </div>
  );
}
