import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine } from 'recharts';
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

  // Calculate dynamic y-axis range based on data
  const maxValue = Math.max(...chartData.map(d => d.value), 100);
  const yAxisMax = Math.ceil(maxValue * 1.2); // Add 20% padding above peak
  
  // Calculate reference line positions (25%, 50%, 75% of max)
  const midLine = Math.round(yAxisMax * 0.5);

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <YAxis domain={[0, yAxisMax]} hide />
          
          {/* Reference lines for visual context */}
          <ReferenceLine 
            y={midLine} 
            stroke="#ffffff15" 
            strokeDasharray="2 2"
          />
          
          <Line
            type="monotone"
            dataKey="value"
            stroke={getStrokeColor(data)}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}