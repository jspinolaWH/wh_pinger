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
  };

  // Default to healthy if status is not recognized
  const config = statusConfig[service.status] || statusConfig.healthy;
  const isHighPriority = service.environment === 'production';
  const updateFrequency = service.heartbeatInterval ? `${service.heartbeatInterval}s` : (isHighPriority ? '30s' : '60s');
  const timeSinceCheck = Math.floor((Date.now() - service.lastCheck.getTime()) / 1000);
  
  // Check if endpoint is unreachable (no httpStatus or error status codes)
  const isUnreachable = !service.httpStatus || service.httpStatus === 0 || service.httpStatus >= 500;
  
  // HTTP status code descriptions
  const httpStatusDescriptions: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    0: 'No Response',
  };

  // Get HTTP status code styling
  const getHttpStatusStyle = (status?: number) => {
    if (!status || status === 0) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    if (status >= 200 && status < 300) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (status >= 300 && status < 400) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (status >= 400 && status < 500) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (status >= 500) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Get HTTP status description
  const getHttpStatusDescription = (status?: number) => {
    if (!status) return 'No Response';
    return httpStatusDescriptions[status] || 'Unknown';
  };
  
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
        relative rounded-xl border backdrop-blur-sm p-4
        transition-all duration-300 flex flex-col h-full
        ${isUnreachable ? 'bg-gray-900/40 border-gray-500/20' : 'bg-black/40'}
        ${isUnreachable ? '' : config.borderColor}
        ${isHighPriority ? 'ring-1 ring-white/5' : ''}
      `}
    >
      {/* Environment Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-lg font-semibold tracking-tight ${isUnreachable ? 'text-gray-400' : ''}`}>
              {service.name}
            </h3>
            <span className="px-2 py-0.5 text-xs rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
              {updateFrequency}
            </span>
            {service.httpStatus && (
              <span 
                className={`px-2 py-0.5 text-xs rounded-full border font-mono ${getHttpStatusStyle(service.httpStatus)}`}
                title={getHttpStatusDescription(service.httpStatus)}
              >
                {service.httpStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className={`text-xs capitalize ${isUnreachable ? 'text-gray-500' : 'text-white/50'}`}>
              {service.environment}
            </p>
            {service.httpStatus && (
              <>
                <span className="text-white/30">•</span>
                <p className={`text-xs ${isUnreachable ? 'text-gray-500' : 'text-white/50'}`}>
                  {getHttpStatusDescription(service.httpStatus)}
                </p>
              </>
            )}
          </div>
        </div>
        <StatusIndicator status={service.status} size="lg" />
      </div>

      {/* Response Time - Large Display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold font-mono tabular-nums ${isUnreachable ? 'text-gray-500' : ''}`}>
            {service.responseTime.toFixed(2)}
          </span>
          <span className={`text-xl font-mono ${isUnreachable ? 'text-gray-600' : 'text-white/50'}`}>ms</span>
        </div>
      </div>

      {/* Status Label */}
      <div className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium mb-3 ${isUnreachable ? 'bg-gray-500/20 text-gray-400' : `${config.bgColor} ${config.color}`}`}>
        {isUnreachable ? 'Unreachable' : config.label}
      </div>

      {/* Metrics Row */}
      <div className="mb-3 pb-3 border-b border-white/5">
        <div>
          <div className="text-xs mb-1 text-white/50">24h Uptime</div>
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
      </div>

      {/* Sparkline */}
      {service.history.length > 0 && (
        <div className="mb-2 flex-1">
          <div className="text-xs mb-1 text-white/50">Response Time Trend</div>
          <Sparkline data={service.history} />
        </div>
      )}

      {/* Last Check */}
      <div className="text-xs text-white/40">
        Last checked: {formatTimeSince(timeSinceCheck)}
      </div>

      {/* Consecutive Failures Warning */}
      {service.consecutiveFailures > 0 && (
        <div className="mt-2 px-2 py-1.5 rounded-lg border text-xs bg-red-500/10 border-red-500/20 text-red-400">
          Consecutive failure - Service is down
        </div>
      )}
    </div>
  );
}
