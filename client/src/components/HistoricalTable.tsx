import { useState } from "react";
import { HourlyTraffic } from "@shared/schema";
import { format } from "date-fns";
import { Download, Filter } from "lucide-react";

interface HistoricalTableProps {
  hourlyTraffic: HourlyTraffic[];
}

export default function HistoricalTable({ hourlyTraffic }: HistoricalTableProps) {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  
  // Calculate pagination
  const totalPages = Math.ceil(hourlyTraffic.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const displayedHours = hourlyTraffic.slice(startIndex, startIndex + pageSize);
  
  const handlePrevious = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const handleNext = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          Hourly Traffic (Last 24 Hours)
        </h2>
        <div>
          <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-2 rounded mr-1">
            <Download className="w-3 h-3 inline mr-1" />
            Export
          </button>
          <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-2 rounded">
            <Filter className="w-3 h-3 inline mr-1" />
            Filter
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Period
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customers In
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customers Out
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Flow
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ending Count
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedHours.map((hour, index) => {
              const hourStart = format(new Date(hour.hour_start), "HH:00");
              const hourEnd = format(new Date(new Date(hour.hour_start).setHours(new Date(hour.hour_start).getHours() + 1)), "HH:00");
              const timePeriod = `${hourStart} - ${hourEnd}`;
              
              return (
                <tr key={hour.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {timePeriod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {hour.customers_in}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {hour.customers_out}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    hour.net_flow >= 0 ? "text-success" : "text-error"
                  }`}>
                    {hour.net_flow >= 0 ? `+${hour.net_flow}` : hour.net_flow}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {hour.ending_count}
                  </td>
                </tr>
              );
            })}
            
            {hourlyTraffic.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No historical data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Showing {Math.min(displayedHours.length, pageSize)} of {hourlyTraffic.length} hours
        </p>
        
        <div className="flex space-x-1">
          <button 
            onClick={handlePrevious}
            disabled={page === 1}
            className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
              page === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
            }`}
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
            // Show pages around current page
            let pageNum;
            if (totalPages <= 3) {
              pageNum = i + 1;
            } else if (page === 1) {
              pageNum = i + 1;
            } else if (page === totalPages) {
              pageNum = totalPages - 2 + i;
            } else {
              pageNum = page - 1 + i;
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
                  page === pageNum ? "bg-primary text-white" : "hover:bg-gray-100"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button 
            onClick={handleNext}
            disabled={page === totalPages}
            className={`px-3 py-1 border border-gray-300 rounded-md text-sm ${
              page === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
