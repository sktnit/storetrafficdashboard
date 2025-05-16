import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LiveView from "@/components/LiveView";
import HistoricalView from "@/components/HistoricalView";
import useWebSocket from "@/hooks/useWebSocket";

type TabType = "live" | "historical";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("live");
  const [storeId, setStoreId] = useState<number>(10);
  
  // Connect to WebSocket
  const { 
    connected,
    currentStats,
    recentEvents,
    historicalStats,
    hourlyTraffic
  } = useWebSocket(storeId);
  
  const handleStoreChange = (newStoreId: number) => {
    setStoreId(newStoreId);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        storeId={storeId} 
        onStoreChange={handleStoreChange} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab("live")}
                className={`inline-block p-4 border-b-2 ${
                  activeTab === "live"
                    ? "border-primary text-primary"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
                aria-current={activeTab === "live" ? "page" : undefined}
              >
                Live Data
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab("historical")}
                className={`inline-block p-4 border-b-2 ${
                  activeTab === "historical"
                    ? "border-primary text-primary"
                    : "border-transparent hover:text-gray-600 hover:border-gray-300"
                }`}
              >
                Historical Data
              </button>
            </li>
          </ul>
        </div>
        
        {/* Views */}
        {activeTab === "live" ? (
          <LiveView 
            currentStats={currentStats} 
            recentEvents={recentEvents} 
          />
        ) : (
          <HistoricalView 
            historicalStats={historicalStats}
            hourlyTraffic={hourlyTraffic}
          />
        )}
      </main>
      
      <Footer connected={connected} />
    </div>
  );
}
