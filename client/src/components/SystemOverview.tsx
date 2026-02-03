import { Activity, Server, AlertCircle, Clock } from 'lucide-react';
import { ServiceData, Alert } from '../types';

interface SystemOverviewProps {
  services: ServiceData[];
  alerts: Alert[];
}

export function SystemOverview({ services, alerts }: SystemOverviewProps) {
  const totalServices = services.length;
  const servicesUp = services.filter(s => s.status !== 'flatline').length;
  const servicesDown = totalServices - servicesUp;
  
  const avgResponseTime = Math.round(
    services
      .filter(s => s.responseTime > 0)
      .reduce((sum, s) => sum + s.responseTime, 0) / 
    services.filter(s => s.responseTime > 0).length || 0
  );

  const overallHealth = Math.round((servicesUp / totalServices) * 100);
  
  const recentAlerts = alerts.filter(a => {
    const hourAgo = Date.now() - 24 * 60 * 60 * 1000;
    return a.timestamp.getTime() > hourAgo;
  }).length;

  const stats = [
    {
      label: 'Services Monitored',
      value: totalServices,
      icon: Server,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Overall Health',
      value: `${overallHealth}%`,
      icon: Activity,
      color: overallHealth >= 95 ? 'text-green-400' : overallHealth >= 80 ? 'text-yellow-400' : 'text-red-400',
      bgColor: overallHealth >= 95 ? 'bg-green-500/10' : overallHealth >= 80 ? 'bg-yellow-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Services Status',
      value: `${servicesUp} UP / ${servicesDown} DOWN`,
      icon: Server,
      color: servicesDown === 0 ? 'text-green-400' : 'text-red-400',
      bgColor: servicesDown === 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      label: 'Avg Response Time',
      value: `${avgResponseTime} ms`,
      icon: Clock,
      color: avgResponseTime < 300 ? 'text-green-400' : avgResponseTime < 600 ? 'text-yellow-400' : 'text-orange-400',
      bgColor: avgResponseTime < 300 ? 'bg-green-500/10' : avgResponseTime < 600 ? 'bg-yellow-500/10' : 'bg-orange-500/10',
    },
    {
      label: 'Alerts (24h)',
      value: recentAlerts,
      icon: AlertCircle,
      color: recentAlerts === 0 ? 'text-green-400' : recentAlerts < 5 ? 'text-yellow-400' : 'text-red-400',
      bgColor: recentAlerts === 0 ? 'bg-green-500/10' : recentAlerts < 5 ? 'bg-yellow-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums mb-0.5">
            {stat.value}
          </div>
          <div className="text-xs text-white/50">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}