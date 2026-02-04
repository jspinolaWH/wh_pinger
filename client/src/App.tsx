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
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch initial services data from backend
  useEffect(() => {
    fetchServices();
  }, []);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('⚠️  WebSocket disconnected, attempting to reconnect...');
      // Reconnection will happen automatically on next render
      // Don't reload the page to avoid losing state
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      const data = await response.json();
      
      // Transform backend data to frontend format
      const transformedServices: ServiceData[] = data.services.map((service: any) => ({
        id: service.name.toLowerCase().replace(/\s+/g, '-'),
        name: service.name,
        environment: getEnvironment(service.tier),
        responseTime: 0, // Will be updated by WebSocket
        status: mapBackendStatus(service.status),
        uptime24h: service.uptime || 100,
        uptime7d: service.uptime || 100,
        lastCheck: service.lastCheck ? new Date(service.lastCheck) : new Date(),
        history: [],
        showChart: service.tier === 'critical' || service.tier === 'standard',
        consecutiveFailures: service.consecutiveFailures || 0,
        heartbeatInterval: service.heartbeatInterval,
        httpStatus: service.httpStatus,
      }));

      setServices(transformedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    console.log('📨 WebSocket message:', message.type);

    switch (message.type) {
      case 'heartbeat_update':
        updateServiceFromHeartbeat(message.data);
        break;

      case 'flatline':
        handleFlatline(message.data);
        break;

      case 'pulse_changed':
        handlePulseChange(message.data);
        break;

      case 'service_recovered':
        handleRecovery(message.data);
        break;

      case 'alert':
        // Alert notifications disabled
        // addAlert(message.data);
        break;

      case 'connected':
        console.log('✅', message.message);
        break;
    }
  };

  const updateServiceFromHeartbeat = (data: any) => {
    setServices(prev => prev.map(service => {
      if (service.name === data.service) {
        const newHistory: CheckHistory = {
          timestamp: new Date(data.timestamp),
          responseTime: data.responseTime || 0,
          status: mapBackendStatus(data.pulse.status),
        };

        return {
          ...service,
          responseTime: data.responseTime || 0,
          status: mapBackendStatus(data.pulse.status),
          lastCheck: new Date(data.timestamp),
          history: [...service.history.slice(-19), newHistory], // Keep last 20
          httpStatus: data.httpStatus,
          uptime24h: data.uptime !== undefined ? data.uptime : service.uptime24h,
        };
      }
      return service;
    }));
  };

  const handleFlatline = (data: any) => {
    setServices(prev => prev.map(service => {
      if (service.name === data.service) {
        return {
          ...service,
          status: 'flatline' as const,
          consecutiveFailures: data.consecutiveFailures,
        };
      }
      return service;
    }));

    // Alert notifications disabled
    // addAlert({
    //   type: 'flatline',
    //   message: `${data.service} has flatlined! ${data.consecutiveFailures} consecutive failures`,
    //   severity: data.severity === 'catastrophic' ? 'critical' : 'critical',
    //   service: data.service,
    //   timestamp: data.timestamp,
    // });
  };

  const handlePulseChange = (data: any) => {
    setServices(prev => prev.map(service => {
      if (service.name === data.service) {
        return {
          ...service,
          status: mapBackendStatus(data.newStatus),
        };
      }
      return service;
    }));

    // Alert notifications disabled
    // if (isStatusDegraded(data.oldStatus, data.newStatus)) {
    //   addAlert({
    //     type: 'degraded',
    //     message: `${data.service} pulse degraded: ${data.oldStatus} → ${data.newStatus}`,
    //     severity: 'warning',
    //     service: data.service,
    //     timestamp: data.timestamp,
    //   });
    // }
  };

  const handleRecovery = (data: any) => {
    setServices(prev => prev.map(service => {
      if (service.name === data.service) {
        return {
          ...service,
          status: 'healthy' as const,
          consecutiveFailures: 0,
        };
      }
      return service;
    }));

    // Alert notifications disabled
    // const downtimeMinutes = Math.round(data.downtime / 1000 / 60);
    // addAlert({
    //   type: 'recovery',
    //   message: `✅ ${data.service} has recovered! Downtime: ${downtimeMinutes} minutes`,
    //   severity: 'warning',
    //   service: data.service,
    //   timestamp: data.timestamp,
    // });
  };

  const addAlert = (alertData: any) => {
    const newAlert: Alert = {
      id: Date.now().toString(),
      serviceId: alertData.service?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      serviceName: alertData.service || 'Unknown',
      severity: alertData.severity || 'warning',
      message: alertData.message,
      timestamp: new Date(alertData.timestamp || Date.now()),
    };

    setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep last 10 alerts
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // Helper functions
  const mapBackendStatus = (status: string): 'healthy' | 'warning' | 'degraded' | 'critical' | 'flatline' | 'unavailable' => {
    if (!status || status === 'unknown') return 'healthy';
    return status as any;
  };

  const getEnvironment = (tier: string): 'production' | 'development' | 'preview' => {
    if (tier === 'critical') return 'production';
    if (tier === 'standard') return 'development';
    return 'preview';
  };

  const isStatusDegraded = (oldStatus: string, newStatus: string): boolean => {
    const hierarchy = { healthy: 0, warning: 1, degraded: 2, critical: 3, unavailable: 3, flatline: 4 };
    return (hierarchy[newStatus as keyof typeof hierarchy] || 0) > (hierarchy[oldStatus as keyof typeof hierarchy] || 0);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] text-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm flex-shrink-0">
          <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">WasteHero Heartbeat Monitor</h1>
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

export default App;
