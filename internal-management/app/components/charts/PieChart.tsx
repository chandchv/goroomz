import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

interface PieDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface PieChartProps {
  data: PieDataPoint[];
  title?: string;
  nameKey?: string;
  valueKey?: string;
  height?: number;
  colors?: string[];
  showPercentage?: boolean;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (value: number) => string;
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4'  // cyan
];

export default function PieChart({
  data,
  title,
  nameKey = 'name',
  valueKey = 'value',
  height = 300,
  colors = DEFAULT_COLORS,
  showPercentage = true,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 100,
  formatValue
}: PieChartProps) {
  const defaultFormatter = (value: number) => value.toString();
  const formatter = formatValue || defaultFormatter;

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item[valueKey], 0);

  // Custom label renderer
  const renderLabel = (entry: any) => {
    if (!showPercentage) {
      return entry[nameKey];
    }
    const percentage = ((entry[valueKey] / total) * 100).toFixed(1);
    return `${entry[nameKey]}: ${percentage}%`;
  };

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Value: {formatter(data.value)}
          </p>
          {showPercentage && (
            <p className="text-sm text-gray-600">
              Percentage: {percentage}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={valueKey}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Export default colors for use in parent components
export { DEFAULT_COLORS };
