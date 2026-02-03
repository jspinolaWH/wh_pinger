import { StatusIndicator } from './StatusIndicator';
import { Sparkline } from './Sparkline';
import { ServiceData } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ServiceCardProps {
  service: ServiceData;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const statusConfig = {
    healthy: {
      label: 'Healthy',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    warning: {
      label: 'Warning',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    degraded: {
      label: 'Degraded',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    critical: {
      label: 'Critical',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    flatline: {
      label: 'FLATLINE',
      color: 'text-red-900',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-900/40',
    },
  };

  // Default to healthy if status is not recognized
  const config = statusConfig[service.status] || statusConfig.healthy;
  const isHighPriority = service.environment === 'production';
  const updateFrequency = service.heartbeatInterval ? `${service.heartbeatInterval}s` : (isHighPriority ? '30s' : '60s');
  const timeSinceCheck = Math.floor((Date.now() - service.lastCheck.getTime()) / 1000);
  
  // Get color for HTTP status badge
  const getHttpStatusColor = (status: number | undefined) => {
    if (!status) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    if (status >= 200 && status < 300) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (status >= 300 && status < 400) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (status >= 400 && status < 500) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (status >= 500) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };
  
  const httpStatusColor = getHttpStatusColor(service.httpStatus);
  
  const formatTimeSince = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  return (
    <div
      className={`
        relative rounded-xl border bg-black/40 backdrop-blur-sm p-4
        transition-all duration-300 flex flex-col h-full
        ${config.borderColor}
        ${isHighPriority ? 'ring-1 ring-white/5' : ''}
      `}
    >
      {/* Environment Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold tracking-tight">{service.name}</h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {updateFrequency}
            </span>
            {service.httpStatus && (
              <span className={`px-2 py-0.5 text-xs rounded-full border font-mono ${httpStatusColor}`}>
                {service.httpStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-white/50 mt-0.5 capitalize">{service.environment}</p>
        </div>
        <StatusIndicator status={service.status} size="lg" />
      </div>

      {/* Response Time - Large Display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold font-mono tabular-nums">
            {service.responseTime.toFixed(2)}
          </span>
          <span className="text-xl text-white/50 font-mono">ms</span>
        </div>
      </div>

      {/* Status Label */}
      <div className={`inline-flex px-3 py-1 rounded-lg ${config.bgColor} ${config.color} text-sm font-medium mb-3`}>
        {config.label}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-white/5">
        <div>
          <div className="text-xs text-white/50 mb-1">24h Uptime</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold font-mono tabular-nums">
              {service.uptime24h}%
            </span>
            {service.uptime24h >= 99 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-white/50 mb-1">7d Uptime</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold font-mono tabular-nums">
              {service.uptime7d}%
            </span>
            {service.uptime7d >= 98 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {service.history.length > 0 && (
        <div className="mb-2 flex-1">
          <div className="text-xs text-white/50 mb-1">Response Time Trend</div>
          <Sparkline data={service.history} />
        </div>
      )}

      {/* Last Check */}
      <div className="text-xs text-white/40">
        Last checked: {formatTimeSince(timeSinceCheck)}
      </div>

      {/* Consecutive Failures Warning */}
      {service.consecutiveFailures > 0 && (
        <div className="mt-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {service.consecutiveFailures} consecutive failure{service.consecutiveFailures > 1 ? 's' : ''}
          {service.status === 'flatline' && ' - Service is down'}
        </div>
      )}
    </div>
  );
}
