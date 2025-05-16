import { useState, useEffect } from "react";
import { Chart } from "@/components/ui/chart";
import StatCard from "@/components/StatCard";
import HistoricalTable from "@/components/HistoricalTable";
import { HourlyTraffic, HistoricalStats } from "@shared/schema";
import { format } from "date-fns";

interface HistoricalViewProps {
  historicalStats: HistoricalStats;
  hourlyTraffic: HourlyTraffic[];
}

export default function HistoricalView({ 
  historicalStats, 
  hourlyTraffic 
}: HistoricalViewProps) {
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  }>({
    labels: [],
    datasets: [
      {
        label: "Net Customer Flow",
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
      },
    ],
  });

  // Update chart when hourlyTraffic changes
  useEffect(() => {
    if (hourlyTraffic.length > 0) {
      const labels = hourlyTraffic.map(hour => 
        format(new Date(hour.hour_start), "HH:00")
      );
      
      const netFlowData = hourlyTraffic.map(hour => hour.net_flow);
      
      // Create dynamic colors based on value
      const backgroundColors = netFlowData.map(value => 
        value >= 0 ? "rgba(74, 222, 128, 0.7)" : "rgba(255, 82, 82, 0.7)"
      );
      
      const borderColors = netFlowData.map(value => 
        value >= 0 ? "rgb(74, 222, 128)" : "rgb(255, 82, 82)"
      );
      
      setChartData({
        labels,
        datasets: [
          {
            label: "Net Customer Flow",
            data: netFlowData,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ],
      });
    }
  }, [hourlyTraffic]);

  return (
    <div className="space-y-6">
      {/* Historical Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Visitors (24h)"
          value={historicalStats.totalVisitors24h.toString()}
          colorClass="border-primary"
        />
        <StatCard
          title="Peak Hour"
          value={historicalStats.peakHour}
          subValue={`${historicalStats.peakHourCount} visitors`}
          colorClass="border-success"
        />
        <StatCard
          title="Slowest Hour"
          value={historicalStats.slowestHour}
          subValue={`${historicalStats.slowestHourCount} visitors`}
          colorClass="border-error"
        />
      </div>

      {/* Historical Chart */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          24-Hour Customer Traffic
        </h2>
        <div className="h-64">
          <Chart
            type="bar"
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: "Number of Customers",
                  },
                },
                x: {
                  title: {
                    display: true,
                    text: "Hour",
                  },
                },
              },
              plugins: {
                legend: {
                  display: true,
                  position: "top",
                },
                tooltip: {
                  callbacks: {
                    label: function (context: any) {
                      const value = context.raw;
                      return value >= 0
                        ? `Customers: +${value}`
                        : `Customers: ${value}`;
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Historical Table */}
      <HistoricalTable hourlyTraffic={hourlyTraffic} />
    </div>
  );
}
