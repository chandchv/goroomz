import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PerformanceDataPoint {
  name: string;
  value: number;
  target?: number;
  [key: string]: any;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  title?: string;
  valueKey?: string;
  targetKey?: string;
  nameKey?: string;
  height?: number;
  showTarget?: boolean;
  valueLabel?: string;
  targetLabel?: string;
  formatValue?: (value: number) => string;
  color?: string;
  targetColor?: string;
}

const COLORS = {
  primary: '#3B82F6',
  target: '#10B981',
  secondary: '#8B5CF6',
  warning: '#F59E0B',
  danger: '#EF4444'
};

export default function PerformanceChart({
  data,
  title,
  valueKey = 'value',
  targetKey = 'target',
  nameKey = 'name',
  height = 300,
  showTarget = false,
  valueLabel = 'Actual',
  targetLabel = 'Target',
  formatValue,
  color = COLORS.primary,
  targetColor = COLORS.target
}: PerformanceChartProps) {
  const defaultFormatter = (value: number) => value.toString();
  const formatter = formatValue || defaultFormatter;

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey={nameKey}
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={{ stroke: '#E5E7EB' }}
            tickFormatter={formatter}
          />
          <Tooltip
            formatter={(value: number) => formatter(value)}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '0.375rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '1rem' }}
            iconType="rect"
          />
          <Bar
            dataKey={valueKey}
            fill={color}
            name={valueLabel}
            radius={[4, 4, 0, 0]}
          />
          {showTarget && (
            <Bar
              dataKey={targetKey}
              fill={targetColor}
              name={targetLabel}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
