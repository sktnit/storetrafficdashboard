"use client";

import { useRef, useEffect } from "react";
import { type ChartData, type ChartOptions, Chart as ChartJS, registerables } from "chart.js";
import { Chart as ReactChart } from "react-chartjs-2";

// Register all Chart.js components
ChartJS.register(...registerables);

interface ChartProps {
  type: "line" | "bar" | "pie" | "doughnut" | "radar" | "polarArea" | "bubble" | "scatter";
  data: ChartData<any>;
  options?: ChartOptions<any>;
  width?: number;
  height?: number;
  className?: string;
}

export function Chart({
  type,
  data,
  options,
  width,
  height,
  className,
}: ChartProps) {
  const chartRef = useRef<ChartJS<any>>(null);

  // Update chart when data changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [data]);

  return (
    <div className={className}>
      <ReactChart
        ref={chartRef}
        type={type}
        data={data}
        options={options}
        width={width}
        height={height}
      />
    </div>
  );
}
