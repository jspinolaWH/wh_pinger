import { useState } from 'react';
import { Save, Plus, Trash2, Settings2, Clock, Activity, Bell, Database, Wifi, Palette } from 'lucide-react';
import { Configuration, ServiceData } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Textarea } from '../components/ui/textarea';

function ConfigPage() {
  const [config, setConfig] = useState<Configuration>({
    thresholds: {
      healthy: 200,
      warning: 500,
      degraded: 1000,
      critical: 2000,
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
      sounds: {
        flatline: true,
        recovered: true,
        degraded: true,
        thresholdViolation: false,
      },
    },
    dataRetention: {
      historyPoints: 20,
      logRetentionDays: 30,
      autoCleanup: true,
    },
    websocket: {
      port: 3001,
      reconnectTimeout: 5000,
      updateThrottle: 1000,
    },
    display: {
      theme: 'dark',
      chartAnimation: true,
      compactView: false,
      browserNotifications: true,
    },
  });

  const [services, setServices] = useState<ServiceData[]>([
    {
      id: 'prod',
      name: 'PROD',
      environment: 'production',
      url: 'https://api.prod.example.com/graphql',
      tier: 'critical',
      heartbeatInterval: 2,
      checkType: 'basic',
      showChart: true,
      responseTime: 0,
      status: 'healthy',
      uptime24h: 0,
      uptime7d: 0,
      lastCheck: new Date(),
      history: [],
      consecutiveFailures: 0,
      checkConfig: {
        timeout: 10000,
      },
    },
  ]);

  const [newService, setNewService] = useState<Partial<ServiceData>>({
    name: '',
    environment: 'preview',
    url: '',
    tier: 'standard',
    heartbeatInterval: 5,
    checkType: 'basic',
    showChart: true,
    checkConfig: {
      timeout: 10000,
    },
  });

  const handleSaveConfig = () => {
    console.log('Saving configuration:', config);
    // Here you would save to localStorage, API, or context
  };

  const handleAddService = () => {
    if (!newService.name || !newService.url) return;
    
    const service: ServiceData = {
      id: `service-${Date.now()}`,
      name: newService.name,
      environment: newService.environment as any || 'preview',
      url: newService.url,
      tier: newService.tier || 'standard',
      heartbeatInterval: newService.heartbeatInterval || 5,
      checkType: newService.checkType || 'basic',
      showChart: newService.showChart ?? true,
      checkConfig: newService.checkConfig || { timeout: 10000 },
      responseTime: 0,
      status: 'healthy',
      uptime24h: 0,
      uptime7d: 0,
      lastCheck: new Date(),
      history: [],
      consecutiveFailures: 0,
    };

    setServices([...services, service]);
    setNewService({
      name: '',
      environment: 'preview',
      url: '',
      tier: 'standard',
      heartbeatInterval: 5,
      checkType: 'basic',
      showChart: true,
      checkConfig: { timeout: 10000 },
    });
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight truncate">Configuration</h1>
            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">Manage monitoring settings and services</p>
          </div>
          <Button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0" size="sm">
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Save Changes</span>
          </Button>
        </div>
      </div>

      {/* Main Content - Single Card */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)] overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
              
              {/* Services Management */}
              <section>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <Settings2 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base sm:text-lg font-semibold">Services Management</h2>
                </div>
                
                {/* Add New Service */}
                <div className="mb-6 p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
                  <h3 className="text-sm font-semibold mb-3 text-white/80">Add New Service</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs">Service Name</Label>
                      <Input 
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        placeholder="PROD"
                        className="bg-white/5 border-white/10 h-10 sm:h-9 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <Label className="text-xs">URL Endpoint</Label>
                      <Input 
                        value={newService.url}
                        onChange={(e) => setNewService({ ...newService, url: e.target.value })}
                        placeholder="https://api.example.com"
                        className="bg-white/5 border-white/10 h-10 sm:h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tier</Label>
                      <Select 
                        value={newService.tier}
                        onValueChange={(value: any) => setNewService({ ...newService, tier: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 h-10 sm:h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Environment</Label>
                      <Select 
                        value={newService.environment}
                        onValueChange={(value: any) => setNewService({ ...newService, environment: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 h-10 sm:h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="preview">Preview</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Interval (s)</Label>
                      <Input 
                        type="number"
                        value={newService.heartbeatInterval}
                        onChange={(e) => setNewService({ ...newService, heartbeatInterval: parseInt(e.target.value) })}
                        className="bg-white/5 border-white/10 h-10 sm:h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Check Type</Label>
                      <Select 
                        value={newService.checkType}
                        onValueChange={(value: any) => setNewService({ ...newService, checkType: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 h-10 sm:h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="authenticated">Authenticated</SelectItem>
                          <SelectItem value="query">Custom Query</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Timeout (ms)</Label>
                      <Input 
                        type="number"
                        value={newService.checkConfig?.timeout}
                        onChange={(e) => setNewService({ 
                          ...newService, 
                          checkConfig: { ...newService.checkConfig, timeout: parseInt(e.target.value) }
                        })}
                        className="bg-white/5 border-white/10 h-10 sm:h-9 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddService} size="sm" className="bg-green-600 hover:bg-green-700 h-10 sm:h-9 w-full">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                  {newService.checkType === 'query' && (
                    <div className="mt-3">
                      <Label className="text-xs">Custom Query</Label>
                      <Textarea 
                        value={newService.checkConfig?.query || ''}
                        onChange={(e) => setNewService({ 
                          ...newService, 
                          checkConfig: { ...newService.checkConfig, query: e.target.value }
                        })}
                        placeholder="query { health { status } }"
                        className="bg-white/5 border-white/10 font-mono text-xs h-20"
                      />
                    </div>
                  )}
                </div>

                {/* Existing Services */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">Existing Services</h3>
                  {services.map(service => (
                    <div key={service.id} className="p-3 bg-white/5 rounded border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-white/40">Name</div>
                          <div className="font-medium text-sm">{service.name}</div>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <div className="text-xs text-white/40">URL</div>
                          <div className="truncate text-xs">{service.url}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/40">Tier</div>
                          <div className="capitalize text-xs">{service.tier}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/40">Interval</div>
                          <div className="text-xs">{service.heartbeatInterval}s</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/40">Check Type</div>
                          <div className="capitalize text-xs">{service.checkType}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/40">Chart</div>
                          <div className="text-xs">{service.showChart ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveService(service.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 sm:mr-1" />
                        <span className="sm:hidden">Remove</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Two Column Layout for Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column */}
                <div className="space-y-6">
                  
                  {/* Heartbeat Intervals */}
                  <section>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-semibold">Heartbeat Intervals</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Critical Tier</Label>
                          <p className="text-xs text-white/40">Production systems</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.heartbeatIntervals.critical}
                            onChange={(e) => setConfig({
                              ...config,
                              heartbeatIntervals: { ...config.heartbeatIntervals, critical: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-6">s</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Standard Tier</Label>
                          <p className="text-xs text-white/40">Regular services</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.heartbeatIntervals.standard}
                            onChange={(e) => setConfig({
                              ...config,
                              heartbeatIntervals: { ...config.heartbeatIntervals, standard: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-6">s</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Low Tier</Label>
                          <p className="text-xs text-white/40">Low priority</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.heartbeatIntervals.low}
                            onChange={(e) => setConfig({
                              ...config,
                              heartbeatIntervals: { ...config.heartbeatIntervals, low: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-6">s</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Response Time Thresholds */}
                  <section>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <Activity className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-semibold">Response Thresholds</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Healthy
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.thresholds.healthy}
                            onChange={(e) => setConfig({
                              ...config,
                              thresholds: { ...config.thresholds, healthy: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-8">ms</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Warning
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.thresholds.warning}
                            onChange={(e) => setConfig({
                              ...config,
                              thresholds: { ...config.thresholds, warning: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-8">ms</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          Degraded
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.thresholds.degraded}
                            onChange={(e) => setConfig({
                              ...config,
                              thresholds: { ...config.thresholds, degraded: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-8">ms</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Critical
                        </Label>
                        <div className="text-sm text-white/60">&gt; {config.thresholds.degraded}ms</div>
                      </div>
                    </div>
                  </section>

                  {/* Flatline Detection */}
                  <section>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <span className="text-lg">⚠️</span>
                      <h2 className="text-lg font-semibold">Flatline Detection</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Critical Tier</Label>
                          <p className="text-xs text-white/40">Failures to trigger</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.flatlineDetection.critical}
                            onChange={(e) => setConfig({
                              ...config,
                              flatlineDetection: { ...config.flatlineDetection, critical: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Standard Tier</Label>
                          <p className="text-xs text-white/40">Failures to trigger</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.flatlineDetection.standard}
                            onChange={(e) => setConfig({
                              ...config,
                              flatlineDetection: { ...config.flatlineDetection, standard: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Low Tier</Label>
                          <p className="text-xs text-white/40">Failures to trigger</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.flatlineDetection.low}
                            onChange={(e) => setConfig({
                              ...config,
                              flatlineDetection: { ...config.flatlineDetection, low: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Data Retention */}
                  <section>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <Database className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-semibold">Data Retention</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">History Points</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.dataRetention.historyPoints}
                            onChange={(e) => setConfig({
                              ...config,
                              dataRetention: { ...config.dataRetention, historyPoints: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Log Retention</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.dataRetention.logRetentionDays}
                            onChange={(e) => setConfig({
                              ...config,
                              dataRetention: { ...config.dataRetention, logRetentionDays: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-12">days</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Auto Cleanup</Label>
                          <p className="text-xs text-white/40">Delete old data</p>
                        </div>
                        <Switch 
                          checked={config.dataRetention.autoCleanup}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            dataRetention: { ...config.dataRetention, autoCleanup: checked }
                          })}
                        />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  
                  {/* Audio Alerts */}
                  <section>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <Bell className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-semibold">Audio Alerts</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Enable Audio</Label>
                        <Switch 
                          checked={config.audio.enabled}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            audio: { ...config.audio, enabled: checked }
                          })}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">Volume</Label>
                          <span className="text-sm text-white/60">{config.audio.volume}%</span>
                        </div>
                        <Slider 
                          value={[config.audio.volume]}
                          onValueChange={(value) => setConfig({
                            ...config,
                            audio: { ...config.audio, volume: value[0] }
                          })}
                          max={100}
                          step={1}
                          className="py-2"
                        />
                      </div>
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Alert Sounds</p>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Flatline Detected</Label>
                          <Switch 
                            checked={config.audio.sounds.flatline}
                            onCheckedChange={(checked) => setConfig({
                              ...config,
                              audio: { ...config.audio, sounds: { ...config.audio.sounds, flatline: checked } }
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Service Recovered</Label>
                          <Switch 
                            checked={config.audio.sounds.recovered}
                            onCheckedChange={(checked) => setConfig({
                              ...config,
                              audio: { ...config.audio, sounds: { ...config.audio.sounds, recovered: checked } }
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Pulse Degraded</Label>
                          <Switch 
                            checked={config.audio.sounds.degraded}
                            onCheckedChange={(checked) => setConfig({
                              ...config,
                              audio: { ...config.audio, sounds: { ...config.audio.sounds, degraded: checked } }
                            })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Threshold Violations</Label>
                          <Switch 
                            checked={config.audio.sounds.thresholdViolation}
                            onCheckedChange={(checked) => setConfig({
                              ...config,
                              audio: { ...config.audio, sounds: { ...config.audio.sounds, thresholdViolation: checked } }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* WebSocket Configuration */}
                  <section>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <Wifi className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-semibold">WebSocket</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Port</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.websocket.port}
                            onChange={(e) => setConfig({
                              ...config,
                              websocket: { ...config.websocket, port: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Reconnect Timeout</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.websocket.reconnectTimeout}
                            onChange={(e) => setConfig({
                              ...config,
                              websocket: { ...config.websocket, reconnectTimeout: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-8">ms</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Update Throttle</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number"
                            value={config.websocket.updateThrottle}
                            onChange={(e) => setConfig({
                              ...config,
                              websocket: { ...config.websocket, updateThrottle: parseInt(e.target.value) }
                            })}
                            className="bg-white/5 border-white/10 w-20 h-8 text-sm text-right"
                          />
                          <span className="text-sm text-white/60 w-8">ms</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Display Settings */}
                  <section>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                      <Palette className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-semibold">Display & UI</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Dark Theme</Label>
                          <p className="text-xs text-white/40">Use dark colors</p>
                        </div>
                        <Switch 
                          checked={config.display.theme === 'dark'}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            display: { ...config.display, theme: checked ? 'dark' : 'light' }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Chart Animations</Label>
                          <p className="text-xs text-white/40">Animate transitions</p>
                        </div>
                        <Switch 
                          checked={config.display.chartAnimation}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            display: { ...config.display, chartAnimation: checked }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Compact View</Label>
                          <p className="text-xs text-white/40">Condensed layout</p>
                        </div>
                        <Switch 
                          checked={config.display.compactView}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            display: { ...config.display, compactView: checked }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Browser Notifications</Label>
                          <p className="text-xs text-white/40">Desktop alerts</p>
                        </div>
                        <Switch 
                          checked={config.display.browserNotifications}
                          onCheckedChange={(checked) => setConfig({
                            ...config,
                            display: { ...config.display, browserNotifications: checked }
                          })}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigPage;