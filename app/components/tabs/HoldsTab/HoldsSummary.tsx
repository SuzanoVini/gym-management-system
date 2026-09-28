interface HoldsSummaryProps {
  total: number;
  active: number;
  upcoming: number;
  ended: number;
}

export default function HoldsSummary({ total, active, upcoming, ended }: HoldsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="section-container border-l-4 border-blue-600">
        <div className="text-sm text-gray-600">Total Holds</div>
        <div className="text-3xl font-bold mt-1">{total}</div>
      </div>
      <div className="section-container border-l-4 border-green-600">
        <div className="text-sm text-gray-600">Active</div>
        <div className="text-3xl font-bold mt-1">{active}</div>
      </div>
      <div className="section-container border-l-4 border-yellow-600">
        <div className="text-sm text-gray-600">Upcoming</div>
        <div className="text-3xl font-bold mt-1">{upcoming}</div>
      </div>
      <div className="section-container border-l-4 border-gray-600">
        <div className="text-sm text-gray-600">Ended</div>
        <div className="text-3xl font-bold mt-1">{ended}</div>
      </div>
    </div>
  );
}
