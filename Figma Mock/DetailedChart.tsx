import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ServiceData } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface DetailedChartProps {
  service: ServiceData;
  onClose: () => void;
}

export function DetailedChart({ service, onClose }: DetailedChartProps) {
  const chartData = service.history.map(item => ({
    time: item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    responseTime: item.responseTime,
    fullTime: item.timestamp.toLocaleString(),
  }));

  const getStrokeColor = (responseTime: number) => {
    if (responseTime === 0) return '#8b0000';
    if (responseTime < 200) return '#00ff00';
    if (responseTime < 500) return '#ffff00';
    if (responseTime < 1000) return '#ff8800';
    return '#ff0000';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg px-3 py-2 backdrop-blur-sm">
          <p className="text-xs text-white/60 mb-1">{payload[0].payload.fullTime}</p>
          <p className="text-sm font-mono font-semibold">
            {payload[0].value} ms
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-[#0a0a0a] border border-white/10 rounded-xl w-full max-w-5xl p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">{service.name} - Response Time History</h2>
              <p className="text-sm text-white/50 mt-1">Last 20 checks over ~10 minutes</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chart */}
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="time"
                  stroke="#ffffff40"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#ffffff60' }}
                />
                <YAxis
                  stroke="#ffffff40"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#ffffff60' }}
                  label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft', fill: '#ffffff60' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Threshold Lines */}
                <ReferenceLine
                  y={200}
                  stroke="#ffff00"
                  strokeDasharray="3 3"
                  label={{ value: 'Warning: 200ms', position: 'right', fill: '#ffff00', fontSize: 12 }}
                />
                <ReferenceLine
                  y={500}
                  stroke="#ff8800"
                  strokeDasharray="3 3"
                  label={{ value: 'Degraded: 500ms', position: 'right', fill: '#ff8800', fontSize: 12 }}
                />
                <ReferenceLine
                  y={1000}
                  stroke="#ff0000"
                  strokeDasharray="3 3"
                  label={{ value: 'Critical: 1000ms', position: 'right', fill: '#ff0000', fontSize: 12 }}
                />

                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#00ff00"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#00ff00' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-white/60">Healthy (&lt; 200ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-white/60">Warning (200-500ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-white/60">Degraded (500-1000ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-white/60">Critical (&gt; 1000ms)</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
