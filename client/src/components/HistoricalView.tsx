import { useState, useEffect } from "react";
import HistoricalTable from "@/components/HistoricalTable";
import { HourlyTraffic, HistoricalStats } from "@shared/schema";
import { format } from "date-fns";

interface HistoricalViewProps {
  historicalStats: HistoricalStats;
  hourlyTraffic: HourlyTraffic[];
}

export default function HistoricalView({ hourlyTraffic }: HistoricalViewProps) {
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
      const labels = hourlyTraffic.map((hour) =>
        format(new Date(hour.hour_start), "HH:00")
      );

      const netFlowData = hourlyTraffic.map((hour) => hour.net_flow);

      // Create dynamic colors based on value
      const backgroundColors = netFlowData.map((value) =>
        value >= 0 ? "rgba(74, 222, 128, 0.7)" : "rgba(255, 82, 82, 0.7)"
      );

      const borderColors = netFlowData.map((value) =>
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
      {/* Historical Table */}
      <HistoricalTable hourlyTraffic={hourlyTraffic} />
    </div>
  );
}
