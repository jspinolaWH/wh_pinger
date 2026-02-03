import { useState, useEffect } from 'react';
import { ServiceCard } from './components/ServiceCard';
import { AlertBanner } from './components/AlertBanner';
import { SystemOverview } from './components/SystemOverview';
import { SettingsCard } from './components/SettingsCard';
import { ServiceData, Alert, CheckHistory } from './types';

function App() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Initialize services with mock data
  useEffect(() => {
    const initialServices: ServiceData[] = [
      {
        id: 'prod',
        name: 'PROD',
        environment: 'production',
        responseTime: 145,
        status: 'healthy',
        uptime24h: 99.8,
        uptime7d: 99.5,
        lastCheck: new Date(),
        history: generateHistory(145, 'healthy'),
        showChart: true,
        consecutiveFailures: 0,
      },
      {
        id: 'dev',
        name: 'DEV',
        environment: 'development',
        responseTime: 320,
        status: 'warning',
        uptime24h: 98.2,
        uptime7d: 97.8,
        lastCheck: new Date(),
        history: generateHistory(320, 'warning'),
        showChart: true,
        consecutiveFailures: 0,
      },
      {
        id: 'preview-demo',
        name: 'PREVIEW DEMO',
        environment: 'preview',
        responseTime: 178,
        status: 'healthy',
        uptime24h: 99.9,
        uptime7d: 99.7,
        lastCheck: new Date(),
        history: generateHistory(178, 'healthy'),
        showChart: true,
        consecutiveFailures: 0,
      },
      {
        id: 'preview-1',
        name: 'PREVIEW 1',
        environment: 'preview',
        responseTime: 890,
        status: 'degraded',
        uptime24h: 95.5,
        uptime7d: 94.2,
        lastCheck: new Date(),
        history: generateHistory(890, 'degraded'),
        showChart: false,
        consecutiveFailures: 0,
      },
      {
        id: 'preview-2',
        name: 'PREVIEW 2',
        environment: 'preview',
        responseTime: 205,
        status: 'healthy',
        uptime24h: 99.1,
        uptime7d: 98.9,
        lastCheck: new Date(),
        history: generateHistory(205, 'healthy'),
        showChart: false,
        consecutiveFailures: 0,
      },
      {
        id: 'preview-6',
        name: 'PREVIEW 6',
        environment: 'preview',
        responseTime: 0,
        status: 'flatline',
        uptime24h: 87.3,
        uptime7d: 91.5,
        lastCheck: new Date(),
        history: generateHistory(0, 'flatline'),
        showChart: false,
        consecutiveFailures: 3,
      },
    ];
    setServices(initialServices);

    // Add initial alert for flatline
    setAlerts([
      {
        id: '1',
        serviceId: 'preview-6',
        serviceName: 'PREVIEW 6',
        severity: 'critical',
        message: 'PREVIEW 6 has flatlined. 3 consecutive failures',
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(prev => prev.map(service => {
        if (service.status === 'flatline') return service; // Don't update flatlined services

        const newResponseTime = generateNewResponseTime(service.responseTime, service.status);
        const newStatus = getStatusFromResponseTime(newResponseTime);
        const newHistory = [...service.history.slice(1), {
          timestamp: new Date(),
          responseTime: newResponseTime,
          status: newStatus,
        }];

        return {
          ...service,
          responseTime: newResponseTime,
          status: newStatus,
          history: newHistory,
          lastCheck: new Date(),
        };
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] text-white flex flex-col">
      {/* Alert Banners */}
      <div className="fixed top-0 left-0 right-0 z-40">
        {alerts.map(alert => (
          <AlertBanner
            key={alert.id}
            alert={alert}
            onDismiss={() => dismissAlert(alert.id)}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${alerts.length > 0 ? 'pt-16' : 'pt-0'}`}>
        {/* Header */}
        <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm flex-shrink-0">
          <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Server Monitor</h1>
              <p className="text-xs text-white/60 mt-0.5">Real-time health checks and performance metrics</p>
            </div>
            <SettingsCard />
          </div>
        </div>

        {/* System Overview */}
        <div className="max-w-[1800px] mx-auto px-6 py-4 w-full flex-shrink-0">
          <SystemOverview services={services} alerts={alerts} />
        </div>

        {/* Service Cards Grid */}
        <div className="flex-1 max-w-[1800px] mx-auto px-6 pb-6 w-full overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-full">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function generateHistory(baseResponseTime: number, status: string): CheckHistory[] {
  const history: CheckHistory[] = [];
  const now = Date.now();
  
  for (let i = 20; i >= 0; i--) {
    const timestamp = new Date(now - i * 30000); // 30 seconds apart
    const variance = status === 'flatline' ? 0 : (Math.random() - 0.5) * 100;
    const responseTime = status === 'flatline' ? 0 : Math.max(0, baseResponseTime + variance);
    
    history.push({
      timestamp,
      responseTime,
      status: status === 'flatline' ? 'flatline' : getStatusFromResponseTime(responseTime),
    });
  }
  
  return history;
}

function generateNewResponseTime(current: number, currentStatus: string): number {
  if (currentStatus === 'flatline') return 0;
  
  const variance = (Math.random() - 0.5) * 50;
  const drift = (Math.random() - 0.5) * 10;
  return Math.max(50, Math.min(1500, current + variance + drift));
}

function getStatusFromResponseTime(responseTime: number): 'healthy' | 'warning' | 'degraded' | 'critical' | 'flatline' {
  if (responseTime === 0) return 'flatline';
  if (responseTime < 200) return 'healthy';
  if (responseTime < 500) return 'warning';
  if (responseTime < 1000) return 'degraded';
  return 'critical';
}

export default App;