import { format } from "date-fns";
import { StoreEvent, HourlyTraffic } from "@shared/schema";

// Generate real-time chart data from events
export function generateRealtimeChartData(events: StoreEvent[], intervalMinutes = 5, periods = 7) {
  // Group events by time intervals
  const now = new Date();
  const intervals = [];
  const customersInData = [];
  const customersOutData = [];
  
  // Create time intervals
  for (let i = periods - 1; i >= 0; i--) {
    const intervalTime = new Date(now.getTime() - i * intervalMinutes * 60000);
    intervals.push(format(intervalTime, "HH:mm"));
  }
  
  // For each interval, calculate customers in/out
  for (let i = 0; i < periods; i++) {
    const intervalStart = new Date(now.getTime() - (periods - i) * intervalMinutes * 60000);
    const intervalEnd = new Date(now.getTime() - (periods - i - 1) * intervalMinutes * 60000);
    
    const eventsInInterval = events.filter(event => {
      const eventTime = new Date(event.timestamp);
      return eventTime >= intervalStart && eventTime < intervalEnd;
    });
    
    const customersIn = eventsInInterval.reduce((sum, event) => sum + event.customers_in, 0);
    const customersOut = eventsInInterval.reduce((sum, event) => sum + event.customers_out, 0);
    
    customersInData.push(customersIn);
    customersOutData.push(customersOut);
  }
  
  return {
    labels: intervals,
    datasets: [
      {
        label: "Customers In",
        data: customersInData,
        borderColor: "hsl(142 71% 45%)",
        backgroundColor: "hsla(142 71% 45% / 0.1)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Customers Out",
        data: customersOutData,
        borderColor: "hsl(0 100% 65%)",
        backgroundColor: "hsla(0 100% 65% / 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };
}

// Generate historical chart data from hourly traffic
export function generateHistoricalChartData(hourlyData: HourlyTraffic[]) {
  const labels = hourlyData.map(hour => format(new Date(hour.hour_start), "HH:00"));
  const netFlowData = hourlyData.map(hour => hour.net_flow);
  
  // Create dynamic colors based on value
  const backgroundColors = netFlowData.map(value => 
    value >= 0 ? "rgba(74, 222, 128, 0.7)" : "rgba(255, 82, 82, 0.7)"
  );
  
  const borderColors = netFlowData.map(value => 
    value >= 0 ? "rgb(74, 222, 128)" : "rgb(255, 82, 82)"
  );
  
  return {
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
  };
}
