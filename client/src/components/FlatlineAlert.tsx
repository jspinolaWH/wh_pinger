import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, VolumeX } from 'lucide-react';
import { ServiceData } from '../types';
import { StatusIndicator } from './StatusIndicator';

interface FlatlineAlertProps {
  service: ServiceData;
  onAcknowledge: () => void;
  onMute: () => void;
}

export function FlatlineAlert({ service, onAcknowledge, onMute }: FlatlineAlertProps) {
  const downtime = Math.floor((Date.now() - service.lastCheck.getTime()) / 1000);
  
  const formatDowntime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
    >
      {/* Flashing Red Border */}
      <motion.div
        animate={{
          opacity: [1, 0.3, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 border-8 border-red-600 pointer-events-none"
      />

      <div className="relative max-w-2xl w-full mx-6 text-center">
        {/* Large Pulsing Status Indicator */}
        <div className="flex justify-center mb-8">
          <StatusIndicator status="flatline" size="xl" />
        </div>

        {/* Warning Icon */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -5, 5, -5, 5, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="flex justify-center mb-6"
        >
          <AlertTriangle className="w-24 h-24 text-red-500" />
        </motion.div>

        {/* Main Alert Text */}
        <motion.h1
          animate={{
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
          className="text-6xl font-bold text-red-500 mb-4 tracking-tight"
        >
          FLATLINE DETECTED
        </motion.h1>

        {/* Service Name */}
        <h2 className="text-4xl font-bold mb-6">{service.name}</h2>

        {/* Details */}
        <div className="bg-black/60 border border-red-500/30 rounded-xl p-6 mb-8 space-y-3">
          <div className="flex items-center justify-center gap-3 text-lg">
            <span className="text-white/60">Consecutive Failures:</span>
            <span className="font-mono font-bold text-red-400">{service.consecutiveFailures}</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-lg">
            <span className="text-white/60">Downtime:</span>
            <span className="font-mono font-bold text-red-400">{formatDowntime(downtime)}</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-lg">
            <span className="text-white/60">Environment:</span>
            <span className="font-semibold capitalize">{service.environment}</span>
          </div>
          <div className="pt-3 border-t border-white/10">
            <p className="text-white/50 text-sm">
              Service is not responding to health checks. Immediate attention required.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onAcknowledge}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold"
          >
            <CheckCircle className="w-5 h-5" />
            Acknowledge
          </button>
          <button
            onClick={onMute}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
          >
            <VolumeX className="w-5 h-5" />
            Mute Alerts
          </button>
        </div>

        <p className="text-xs text-white/40 mt-6">
          Press ESC to acknowledge or click outside to dismiss
        </p>
      </div>
    </motion.div>
  );
}
