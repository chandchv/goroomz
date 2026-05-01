import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TrendDataPoint {
  name: string;
  [key: string]: any;
}

interface TrendLine {
  dataKey: string;
  name: string;
  color: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  lines: TrendLine[];
  title?: string;
  nameKey?: string;
  height?: number;
  type?: 'line' | 'area';
  formatValue?: (value: number) => string;
  showGrid?: boolean;
  smooth?: boolean;
}

const COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  yellow: '#F59E0B',
  red: '#EF4444',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6'
};

export default function TrendChart({
  data,
  lines,
  title,
  nameKey = 'name',
  height = 300,
  type = 'line',
  formatValue,
  showGrid = true,
  smooth = true
}: TrendChartProps) {
  const defaultFormatter = (value: number) => value.toString();
  const formatter = formatValue || defaultFormatter;

  const ChartComponent = type === 'area' ? AreaChart : LineChart;

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          )}
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
            iconType="line"
          />
          {type === 'line'
            ? lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type={smooth ? 'monotone' : 'linear'}
                  dataKey={line.dataKey}
                  stroke={line.color}
                  strokeWidth={2}
                  name={line.name}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            : lines.map((line) => (
                <Area
                  key={line.dataKey}
                  type={smooth ? 'monotone' : 'linear'}
                  dataKey={line.dataKey}
                  stroke={line.color}
                  fill={line.color}
                  fillOpacity={0.6}
                  strokeWidth={2}
                  name={line.name}
                />
              ))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// Export color constants for use in parent components
export { COLORS };
