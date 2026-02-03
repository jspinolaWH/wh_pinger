import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { CheckHistory } from '../types';

interface SparklineProps {
  data: CheckHistory[];
}

export function Sparkline({ data }: SparklineProps) {
  const getStrokeColor = (data: CheckHistory[]) => {
    const latestStatus = data[data.length - 1]?.status;
    const statusColors = {
      healthy: '#00ff00',
      warning: '#ffff00',
      degraded: '#ff8800',
      critical: '#ff0000',
      flatline: '#8b0000',
    };
    return statusColors[latestStatus] || '#00ff00';
  };

  const chartData = data.map(item => ({
    value: item.responseTime,
  }));

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={getStrokeColor(data)}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}