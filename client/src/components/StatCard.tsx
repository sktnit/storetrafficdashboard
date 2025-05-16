interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  colorClass: string;
}

export default function StatCard({ title, value, subValue, colorClass }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${colorClass}`}>
      <h3 className="text-sm text-gray-500 font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {subValue && <p className="text-sm text-gray-500">{subValue}</p>}
    </div>
  );
}
