import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Settings2, Clock, Activity, Bell, Database, Wifi, Palette, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ServiceConfig {
  name: string;
  url: string;
  tier: 'critical' | 'standard' | 'low';
  heartbeatInterval: number;
  showChart: boolean;
  checks: {
    name: string;
    query: string;
    strategy: string;
    timeout: number;
  }[];
}

interface ThresholdConfig {
  healthy: number;
  warning: number;
  degraded: number;
}

interface Configuration {
  thresholds: ThresholdConfig;
  heartbeatIntervals: {
    critical: number;
    standard: number;
    low: number;
  };
  flatlineDetection: {
    critical: number;
    standard: number;
    low: number;
  };
  audio: {
    enabled: boolean;
    volume: number;
  };
  dataRetention: {
    historyPoints: number;
    logRetentionDays: number;
    autoCleanup: boolean;
  };
  websocket: {
    port: number;
    reconnectTimeout: number;
  };
}

export function ConfigPage() {
  const [config, setConfig] = useState<Configuration>({
    thresholds: {
      healthy: 200,
      warning: 500,
      degraded: 1000,
    },
    heartbeatIntervals: {
      critical: 2,
      standard: 5,
      low: 5,
    },
    flatlineDetection: {
      critical: 2,
      standard: 3,
      low: 5,
    },
    audio: {
      enabled: true,
      volume: 70,
    },
    dataRetention: {
      historyPoints: 20,
      logRetentionDays: 30,
      autoCleanup: true,
    },
    websocket: {
      port: 3001,
      reconnectTimeout: 5000,
    },
  });

  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [newService, setNewService] = useState<Partial<ServiceConfig>>({
    name: '',
    url: '',
    tier: 'standard',
    heartbeatInterval: 5,
    showChart: true,
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // Load services
      const servicesRes = await fetch('/api/config/services');
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        const loadedServices = data.services || [];
        setServices(loadedServices);
        
        // Extract heartbeat intervals from services (find first service of each tier)
        const criticalService = loadedServices.find((s: ServiceConfig) => s.tier === 'critical');
        const standardService = loadedServices.find((s: ServiceConfig) => s.tier === 'standard');
        const lowService = loadedServices.find((s: ServiceConfig) => s.tier === 'low');
        
        setConfig(prev => ({
          ...prev,
          heartbeatIntervals: {
            critical: criticalService?.heartbeatInterval || 2,
            standard: standardService?.heartbeatInterval || 5,
            low: lowService?.heartbeatInterval || 5,
          },
        }));
      }

      // Load thresholds
      const thresholdsRes = await fetch('/api/config/thresholds');
      if (thresholdsRes.ok) {
        const data = await thresholdsRes.json();
        // Transform API response to expected format
        const transformedThresholds = {
          healthy: data.default.healthy.max,
          warning: data.default.warning.max,
          degraded: data.default.degraded.max,
        };
        setConfig(prev => ({
          ...prev,
          thresholds: transformedThresholds,
          flatlineDetection: {
            critical: data.tiers.critical.flatline.consecutiveFailures,
            standard: data.tiers.standard.flatline.consecutiveFailures,
            low: data.tiers.low.flatline.consecutiveFailures,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    try {
      // Save thresholds
      const thresholdsRes = await fetch('/api/config/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.thresholds),
      });

      // Save services
      const servicesRes = await fetch('/api/config/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services }),
      });

      if (thresholdsRes.ok && servicesRes.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
    }
  };

  const handleAddService = () => {
    if (!newService.name || !newService.url) return;

    const service: ServiceConfig = {
      name: newService.name,
      url: newService.url,
      tier: newService.tier || 'standard',
      heartbeatInterval: newService.heartbeatInterval || 5,
      showChart: newService.showChart ?? true,
      checks: [
        {
          name: 'introspection',
          query: '{ __typename }',
          strategy: 'basic',
          timeout: 10000,
        },
      ],
    };

    setServices([...services, service]);
    setNewService({
      name: '',
      url: '',
      tier: 'standard',
      heartbeatInterval: 5,
      showChart: true,
    });
  };

  const handleRemoveService = (name: string) => {
    setServices(services.filter(s => s.name !== name));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Configuration</h1>
              <p className="text-sm text-white/60 mt-0.5">Manage monitoring settings and services</p>
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={saveStatus === 'saving'}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
              ${saveStatus === 'saved' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}
              ${saveStatus === 'saving' ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Save className="w-4 h-4" />
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved!'}
            {saveStatus === 'idle' && 'Save Changes'}
            {saveStatus === 'error' && 'Retry Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="space-y-8">
          
          {/* Services Management */}
          <section className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
              <Settings2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold">Services Management</h2>
            </div>

            {/* Add New Service */}
            <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-sm font-semibold mb-4 text-white/80">Add New Service</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Service Name</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="PROD"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">URL Endpoint</label>
                  <input
                    type="text"
                    value={newService.url}
                    onChange={(e) => setNewService({ ...newService, url: e.target.value })}
                    placeholder="https://api.example.com/graphql"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Tier</label>
                  <select
                    value={newService.tier}
                    onChange={(e) => setNewService({ ...newService, tier: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="critical">Critical</option>
                    <option value="standard">Standard</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Interval (seconds)</label>
                  <input
                    type="number"
                    value={newService.heartbeatInterval}
                    onChange={(e) => setNewService({ ...newService, heartbeatInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newService.showChart}
                      onChange={(e) => setNewService({ ...newService, showChart: e.target.checked })}
                      className="w-4 h-4 rounded bg-white/5 border-white/10"
                    />
                    <span className="text-sm text-white/80">Show Chart</span>
                  </label>
                </div>
                <div className="flex items-end md:col-span-2">
                  <button
                    onClick={handleAddService}
                    className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Service
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Services */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-3">Existing Services ({services.length})</h3>
              {services.map(service => (
                <div
                  key={service.name}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between"
                >
                  <div className="grid grid-cols-5 gap-4 flex-1">
                    <div>
                      <div className="text-xs text-white/40">Name</div>
                      <div className="font-medium">{service.name}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-white/40">URL</div>
                      <div className="text-sm truncate">{service.url}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40">Tier</div>
                      <div className="capitalize text-sm">{service.tier}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40">Interval</div>
                      <div className="text-sm">{service.heartbeatInterval}s</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveService(service.name)}
                    className="ml-4 p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Two Column Layout for Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Heartbeat Intervals */}
              <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-semibold">Heartbeat Intervals</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(config.heartbeatIntervals).map(([tier, value]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium capitalize">{tier} Tier</div>
                        <div className="text-xs text-white/40">
                          {tier === 'critical' && 'Production systems'}
                          {tier === 'standard' && 'Regular services'}
                          {tier === 'low' && 'Low priority'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setConfig({
                            ...config,
                            heartbeatIntervals: { ...config.heartbeatIntervals, [tier]: parseInt(e.target.value) }
                          })}
                          className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                        />
                        <span className="text-sm text-white/60 w-6">s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Response Time Thresholds */}
              <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <Activity className="w-5 h-5 text-green-400" />
                  <h2 className="text-lg font-semibold">Response Thresholds</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(config.thresholds).map(([level, value]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          level === 'healthy' ? 'bg-green-500' :
                          level === 'warning' ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`}></div>
                        <span className="font-medium capitalize">{level}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setConfig({
                            ...config,
                            thresholds: { ...config.thresholds, [level]: parseInt(e.target.value) }
                          })}
                          className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                        />
                        <span className="text-sm text-white/60 w-8">ms</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-medium">Critical</span>
                    </div>
                    <div className="text-sm text-white/60">&gt; {config.thresholds.degraded}ms</div>
                  </div>
                </div>
              </section>

              {/* Flatline Detection */}
              <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <span className="text-lg">⚠️</span>
                  <h2 className="text-lg font-semibold">Flatline Detection</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(config.flatlineDetection).map(([tier, value]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium capitalize">{tier} Tier</div>
                        <div className="text-xs text-white/40">Consecutive failures</div>
                      </div>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setConfig({
                          ...config,
                          flatlineDetection: { ...config.flatlineDetection, [tier]: parseInt(e.target.value) }
                        })}
                        className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Audio Alerts */}
              <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold">Audio Alerts</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Enable Audio</span>
                    <button
                      onClick={() => setConfig({
                        ...config,
                        audio: { ...config.audio, enabled: !config.audio.enabled }
                      })}
                      className={`
                        relative w-14 h-7 rounded-full transition-colors
                        ${config.audio.enabled ? 'bg-green-600' : 'bg-white/20'}
                      `}
                    >
                      <div
                        className={`
                          absolute top-1 w-5 h-5 rounded-full bg-white transition-transform
                          ${config.audio.enabled ? 'translate-x-7' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                  {config.audio.enabled && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/60">Volume</span>
                        <span className="text-sm font-mono">{config.audio.volume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.audio.volume}
                        onChange={(e) => setConfig({
                          ...config,
                          audio: { ...config.audio, volume: parseInt(e.target.value) }
                        })}
                        className="w-full h-2 rounded-lg appearance-none bg-white/10 slider"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Data Retention */}
              <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-semibold">Data Retention</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">History Points</span>
                    <input
                      type="number"
                      value={config.dataRetention.historyPoints}
                      onChange={(e) => setConfig({
                        ...config,
                        dataRetention: { ...config.dataRetention, historyPoints: parseInt(e.target.value) }
                      })}
                      className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Log Retention</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.dataRetention.logRetentionDays}
                        onChange={(e) => setConfig({
                          ...config,
                          dataRetention: { ...config.dataRetention, logRetentionDays: parseInt(e.target.value) }
                        })}
                        className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                      />
                      <span className="text-sm text-white/60">days</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Auto Cleanup</span>
                    <button
                      onClick={() => setConfig({
                        ...config,
                        dataRetention: { ...config.dataRetention, autoCleanup: !config.dataRetention.autoCleanup }
                      })}
                      className={`
                        relative w-14 h-7 rounded-full transition-colors
                        ${config.dataRetention.autoCleanup ? 'bg-green-600' : 'bg-white/20'}
                      `}
                    >
                      <div
                        className={`
                          absolute top-1 w-5 h-5 rounded-full bg-white transition-transform
                          ${config.dataRetention.autoCleanup ? 'translate-x-7' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>
              </section>

              {/* WebSocket Configuration */}
              <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <Wifi className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold">WebSocket</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Port</span>
                    <input
                      type="number"
                      value={config.websocket.port}
                      onChange={(e) => setConfig({
                        ...config,
                        websocket: { ...config.websocket, port: parseInt(e.target.value) }
                      })}
                      className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Reconnect Timeout</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.websocket.reconnectTimeout}
                        onChange={(e) => setConfig({
                          ...config,
                          websocket: { ...config.websocket, reconnectTimeout: parseInt(e.target.value) }
                        })}
                        className="w-20 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                      />
                      <span className="text-sm text-white/60">ms</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
