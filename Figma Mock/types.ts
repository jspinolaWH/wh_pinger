export interface CheckHistory {
  timestamp: Date;
  responseTime: number;
  status: 'healthy' | 'warning' | 'degraded' | 'critical' | 'flatline';
}

export interface ServiceData {
  id: string;
  name: string;
  environment: 'production' | 'development' | 'preview';
  responseTime: number;
  status: 'healthy' | 'warning' | 'degraded' | 'critical' | 'flatline';
  uptime24h: number;
  uptime7d: number;
  lastCheck: Date;
  history: CheckHistory[];
  showChart: boolean;
  consecutiveFailures: number;
}

export interface Alert {
  id: string;
  serviceId: string;
  serviceName: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
}
