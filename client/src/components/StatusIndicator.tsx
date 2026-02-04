import { motion } from 'framer-motion';

interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-12 h-12',
  };

  const statusConfig = {
    healthy: {
      color: '#00ff00',
      glowColor: 'rgba(0, 255, 0, 0.3)',
      pulseScale: [1, 1.1, 1],
    },
    warning: {
      color: '#ffaa00',
      glowColor: 'rgba(255, 170, 0, 0.3)',
      pulseScale: [1, 1.12, 1],
    },
    critical: {
      color: '#ff0000',
      glowColor: 'rgba(255, 0, 0, 0.3)',
      pulseScale: [1, 1.15, 1],
    },
  };

  const config = statusConfig[status];
  const shouldBlink = status === 'critical';

  return (
    <div className="relative">
      {/* Outer Glow Ring */}
      <motion.div
        className={`absolute inset-0 rounded-full ${sizeClasses[size]}`}
        style={{
          backgroundColor: config.glowColor,
          filter: 'blur(6px)',
        }}
        animate={shouldBlink ? {
          opacity: [0.2, 0.8, 0.2],
          scale: [1, 1.3, 1],
        } : {
          scale: config.pulseScale,
        }}
        transition={{
          duration: shouldBlink ? 0.8 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Main Circle */}
      <motion.div
        className={`relative rounded-full ${sizeClasses[size]}`}
        style={{
          backgroundColor: config.color,
          boxShadow: `0 0 12px ${config.glowColor}`,
        }}
        animate={shouldBlink ? {
          opacity: [1, 0.3, 1],
        } : {
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: shouldBlink ? 0.8 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}