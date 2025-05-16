import { BarChartIcon, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface HeaderProps {
  storeId: number;
  onStoreChange: (storeId: number) => void;
}

export default function Header({ storeId, onStoreChange }: HeaderProps) {
  const queryClient = useQueryClient();
  
  const handleRefresh = () => {
    // Invalidate all queries
    queryClient.invalidateQueries();
  };
  
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <BarChartIcon className="text-2xl text-primary mr-2" />
          <h1 className="text-xl font-semibold text-gray-800">Store Traffic Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            id="storeSelector"
            value={storeId}
            onChange={(e) => onStoreChange(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={10}>Store #10</option>
            <option value={11}>Store #11</option>
            <option value={12}>Store #12</option>
          </select>
          
          <button
            onClick={handleRefresh}
            className="bg-primary text-white px-3 py-1 rounded-md text-sm hover:bg-secondary transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-1" />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
