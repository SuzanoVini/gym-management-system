import {
  type ComponentProps,
  type ComponentType,
  type ReactElement,
  useEffect,
  useState,
} from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import InfoTip from '@/components/ui/InfoTip';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Pie chart active shape renderer
const renderActiveShape = (props: unknown) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as {
    cx: number;
    cy: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    fill: string;
  };
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius * 1.08}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
        }}
      />
    </g>
  );
};

const PieWithActive = Pie as unknown as ComponentType<
  ComponentProps<typeof Pie> & {
    activeIndex?: number;
    activeShape?: (props: unknown) => ReactElement;
  }
>;

export function useOverviewPieSelection() {
  const [activeMembershipIndex, setActiveMembershipIndex] = useState<number | null>(null);
  const [activeReasonIndex, setActiveReasonIndex] = useState<number | null>(null);
  // Click outside handler to reset pie chart active states
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.recharts-pie')) {
        setActiveMembershipIndex(null);
        setActiveReasonIndex(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return {
    activeMembershipIndex,
    setActiveMembershipIndex,
    activeReasonIndex,
    setActiveReasonIndex,
  };
}

export default function OverviewBreakdownCharts({
  membershipChart,
  reasonsChart,
  selection,
}: {
  membershipChart: { name: string; value: number }[];
  reasonsChart: { name: string; value: number }[];
  selection: ReturnType<typeof useOverviewPieSelection>;
}) {
  const {
    activeMembershipIndex,
    setActiveMembershipIndex,
    activeReasonIndex,
    setActiveReasonIndex,
  } = selection;
  return (
    <>
      {/* Membership Breakdown */}
      <div className="section-container">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Membership Types
          <InfoTip label="The plan each active member is currently on, taken from the last roster import. Alumni and expired memberships are excluded, so this reflects who is training now." />
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <PieWithActive
              data={membershipChart}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
              activeShape={renderActiveShape}
              {...(activeMembershipIndex !== null ? { activeIndex: activeMembershipIndex } : {})}
              onMouseEnter={(_, index) => setActiveMembershipIndex(index)}
              onMouseLeave={() => setActiveMembershipIndex(null)}
              onClick={(_, index) => {
                setActiveMembershipIndex(index);
              }}
            >
              {membershipChart.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </PieWithActive>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Cancellation Reasons */}
      <div className="section-container">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Top Cancellation Reasons
          <InfoTip label="The reason recorded on each cancellation in the selected range. Cancellations logged without a reason are grouped as unspecified rather than dropped." />
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <PieWithActive
              data={reasonsChart}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
              activeShape={renderActiveShape}
              {...(activeReasonIndex !== null ? { activeIndex: activeReasonIndex } : {})}
              onMouseEnter={(_, index) => setActiveReasonIndex(index)}
              onMouseLeave={() => setActiveReasonIndex(null)}
              onClick={(_, index) => {
                setActiveReasonIndex(index);
              }}
            >
              {reasonsChart.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </PieWithActive>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
