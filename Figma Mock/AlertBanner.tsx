import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { Alert } from '../types';

interface AlertBannerProps {
  alert: Alert;
  onDismiss: () => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const severityConfig = {
    warning: {
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/40',
      textColor: 'text-orange-300',
    },
    critical: {
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
      textColor: 'text-red-300',
    },
  };

  const config = severityConfig[alert.severity];

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border-b backdrop-blur-sm
      `}
    >
      <motion.div
        animate={alert.severity === 'critical' ? {
          opacity: [1, 0.7, 1],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div>
            <span className="font-semibold">{alert.message}</span>
            <span className="text-xs text-white/50 ml-3">
              {alert.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}