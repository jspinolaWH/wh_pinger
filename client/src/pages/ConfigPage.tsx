import { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Settings2, Clock, Activity, Bell, Database, Palette, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

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
  critical: number;
}

interface Configuration {
  thresholds: ThresholdConfig;
  heartbeatIntervals: {
    critical: number;
    standard: number;
    low: number;
  };
  criticalFailures: {
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
      healthy: 750,
      warning: 1500,
      critical: 1500,
    },
    heartbeatIntervals: {
      critical: 2,
      standard: 5,
      low: 5,
    },
    criticalFailures: {
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
  const previousConfigRef = useRef<{
    heartbeatIntervals: typeof config.heartbeatIntervals;
    services: ServiceConfig[];
  } | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // Load all configurations in parallel
      const [servicesRes, thresholdsRes, audioRes] = await Promise.all([
        fetch('/api/config/services'),
        fetch('/api/config/thresholds'),
        fetch('/api/config/audio')
      ]);

      // Load services
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
      if (thresholdsRes.ok) {
        const data = await thresholdsRes.json();
        // Transform API response to expected format
        const transformedThresholds = {
          healthy: data.default.healthy.max,
          warning: data.default.warning.max,
          critical: data.default.critical.min,
        };
        setConfig(prev => ({
          ...prev,
          thresholds: transformedThresholds,
          criticalFailures: {
            critical: data.tiers.critical.critical.consecutiveFailures,
            standard: data.tiers.standard.critical.consecutiveFailures,
            low: data.tiers.low.critical.consecutiveFailures,
          },
        }));
      }

      // Load audio configuration
      if (audioRes.ok) {
        const data = await audioRes.json();
        setConfig(prev => ({
          ...prev,
          audio: {
            enabled: data.enabled,
            volume: data.volume,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const revertIntervalChanges = async () => {
    if (!previousConfigRef.current) return;
    
    try {
      // Revert to previous intervals
      const revertedServices = previousConfigRef.current.services.map(service => ({
        ...service,
        heartbeatInterval: previousConfigRef.current!.heartbeatIntervals[service.tier]
      }));
      
      const servicesRes = await fetch('/api/config/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: revertedServices }),
      });
      
      if (servicesRes.ok) {
        // Restore UI state
        setConfig(prev => ({
          ...prev,
          heartbeatIntervals: previousConfigRef.current!.heartbeatIntervals
        }));
        setServices(previousConfigRef.current.services);
        toast.success('Changes reverted successfully!');
        previousConfigRef.current = null;
      } else {
        toast.error('Failed to revert changes');
      }
    } catch (error) {
      console.error('Failed to revert changes:', error);
      toast.error('Failed to revert changes');
    }
  };

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    try {
      // Store previous state before saving
      previousConfigRef.current = {
        heartbeatIntervals: {
          critical: services.find(s => s.tier === 'critical')?.heartbeatInterval || 2,
          standard: services.find(s => s.tier === 'standard')?.heartbeatInterval || 5,
          low: services.find(s => s.tier === 'low')?.heartbeatInterval || 5,
        },
        services: [...services]
      };

      // Update services with new heartbeat intervals based on their tier
      const updatedServices = services.map(service => ({
        ...service,
        heartbeatInterval: config.heartbeatIntervals[service.tier]
      }));

      // Save all configurations in parallel
      const [thresholdsRes, servicesRes, audioRes] = await Promise.all([
        fetch('/api/config/thresholds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.thresholds),
        }),
        fetch('/api/config/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ services: updatedServices }),
        }),
        fetch('/api/config/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.audio),
        })
      ]);

      if (thresholdsRes.ok && servicesRes.ok && audioRes.ok) {
        setSaveStatus('saved');
        
        // Check if intervals were changed (requires restart)
        const intervalsChanged = 
          previousConfigRef.current.heartbeatIntervals.critical !== config.heartbeatIntervals.critical ||
          previousConfigRef.current.heartbeatIntervals.standard !== config.heartbeatIntervals.standard ||
          previousConfigRef.current.heartbeatIntervals.low !== config.heartbeatIntervals.low;
        
        if (intervalsChanged) {
          // Show toast with restart prompt
          toast((t) => (
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-semibold text-sm mb-1">⚠️ Restart Required</div>
                <div className="text-sm text-gray-600">
                  Heartbeat intervals changed. Restart the backend server to apply changes.
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    toast.success('Please restart the backend server manually');
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                >
                  OK, I'll Restart
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    revertIntervalChanges();
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
                >
                  Revert Changes
                </button>
              </div>
            </div>
          ), {
            duration: Infinity,
            style: {
              maxWidth: '500px',
            }
          });
        } else {
          toast.success('Configuration saved successfully!');
        }
        
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
      toast.error('Failed to save configuration');
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
      <Toaster position="top-right" />
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
          
          {/* Four Column Layout for Settings - All in one row */}
          <div className="flex flex-row gap-6 overflow-x-auto">
            
            {/* Heartbeat Intervals */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <Clock className="w-4 h-4 text-orange-400" />
                <h2 className="text-base font-semibold">Heartbeat Intervals</h2>
              </div>
              <div className="space-y-3">
                {Object.entries(config.heartbeatIntervals).map(([tier, value]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium capitalize">{tier} Tier</div>
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
                        className="w-20 px-2 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                      />
                      <span className="text-xs text-white/60 w-6">s</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Response Time Thresholds */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <Activity className="w-4 h-4 text-green-400" />
                <h2 className="text-base font-semibold">Response Thresholds</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Healthy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.thresholds.healthy}
                      onChange={(e) => setConfig({
                        ...config,
                        thresholds: { ...config.thresholds, healthy: parseInt(e.target.value) }
                      })}
                      className="w-20 px-2 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                    />
                    <span className="text-xs text-white/60 w-8">ms</span>
                  </div>
                </div>
                <div className="text-xs text-white/40 ml-4">≤ {config.thresholds.healthy}ms</div>
                
                <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium">Warning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.thresholds.warning}
                      onChange={(e) => setConfig({
                        ...config,
                        thresholds: { ...config.thresholds, warning: parseInt(e.target.value) }
                      })}
                      className="w-20 px-2 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                    />
                    <span className="text-xs text-white/60 w-8">ms</span>
                  </div>
                </div>
                <div className="text-xs text-white/40 ml-4">{config.thresholds.healthy}ms - {config.thresholds.warning}ms (sustained)</div>
                
                <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium">Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.thresholds.critical}
                      onChange={(e) => setConfig({
                        ...config,
                        thresholds: { ...config.thresholds, critical: parseInt(e.target.value) }
                      })}
                      className="w-20 px-2 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                    />
                    <span className="text-xs text-white/60 w-8">ms</span>
                  </div>
                </div>
                <div className="text-xs text-white/40 ml-4">&gt; {config.thresholds.critical}ms or failures</div>
              </div>
            </section>

            {/* Audio Alerts */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <Bell className="w-4 h-4 text-purple-400" />
                <h2 className="text-base font-semibold">Audio Alerts</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Enable Audio</span>
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
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/60">Volume</span>
                      <span className="text-xs font-mono">{config.audio.volume}%</span>
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
                      className="w-full h-1.5 rounded-lg appearance-none bg-white/10 slider"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Data Retention */}
            <section className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <Database className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-semibold">Data Retention</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">History Points</span>
                  <input
                    type="number"
                    value={config.dataRetention.historyPoints}
                    onChange={(e) => setConfig({
                      ...config,
                      dataRetention: { ...config.dataRetention, historyPoints: parseInt(e.target.value) }
                    })}
                    className="w-20 px-2 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Log Retention</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.dataRetention.logRetentionDays}
                      onChange={(e) => setConfig({
                        ...config,
                        dataRetention: { ...config.dataRetention, logRetentionDays: parseInt(e.target.value) }
                      })}
                      className="w-20 px-2 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-right"
                    />
                    <span className="text-xs text-white/60">days</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auto Cleanup</span>
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
          </div>

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
        </div>
      </div>
    </div>
  );
}
