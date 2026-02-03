import { X, Volume2, VolumeX, Server, Clock, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceData } from '../types';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceData[];
  audioEnabled: boolean;
  onAudioToggle: () => void;
}

export function ConfigPanel({ isOpen, onClose, services, audioEnabled, onAudioToggle }: ConfigPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0a0a0a] border-l border-white/10 z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Configuration</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Backend Configuration */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Wifi className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold">Backend Connection</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Backend API URL</label>
                    <input
                      type="text"
                      placeholder="http://localhost:3000/api"
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-white/40 mt-1">
                      Enter the IP address or URL of your health check backend API
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">API Key (Optional)</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                    />
                  </div>
                  <button className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-medium">
                    Connect to Backend
                  </button>
                </div>
              </section>

              {/* Alert Settings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold">Alert Settings</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <div className="font-medium mb-1">Audio Alerts</div>
                      <div className="text-xs text-white/50">Play sound for critical alerts</div>
                    </div>
                    <button
                      onClick={onAudioToggle}
                      className={`
                        relative w-14 h-7 rounded-full transition-colors
                        ${audioEnabled ? 'bg-green-600' : 'bg-white/20'}
                      `}
                    >
                      <motion.div
                        animate={{ x: audioEnabled ? 28 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-5 h-5 rounded-full bg-white"
                      />
                    </button>
                  </div>

                  {audioEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-sm text-white/60 mb-2">Alert Volume</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="70"
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span>Quiet</span>
                        <span>Loud</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </section>

              {/* Check Interval */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold">Check Intervals</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-white/60">Production Services</label>
                      <span className="text-sm font-mono">30s</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="300"
                      step="5"
                      defaultValue="30"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-white/60">Other Services</label>
                      <span className="text-sm font-mono">60s</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="600"
                      step="10"
                      defaultValue="60"
                      className="w-full"
                    />
                  </div>
                </div>
              </section>

              {/* Response Time Thresholds */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Server className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold">Response Time Thresholds</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                      Warning (ms)
                    </label>
                    <input
                      type="number"
                      defaultValue="200"
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2" />
                      Degraded (ms)
                    </label>
                    <input
                      type="number"
                      defaultValue="500"
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" />
                      Critical (ms)
                    </label>
                    <input
                      type="number"
                      defaultValue="1000"
                      className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-white/20 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </section>

              {/* Monitored Services */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Monitored Services</h3>
                  <button className="px-3 py-1 text-sm rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                    Add Service
                  </button>
                </div>
                <div className="space-y-2">
                  {services.map(service => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-white/50 capitalize">{service.environment}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`
                          px-2 py-1 text-xs rounded
                          ${service.status === 'healthy' ? 'bg-green-500/20 text-green-400' : ''}
                          ${service.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                          ${service.status === 'degraded' ? 'bg-orange-500/20 text-orange-400' : ''}
                          ${service.status === 'critical' ? 'bg-red-500/20 text-red-400' : ''}
                          ${service.status === 'flatline' ? 'bg-red-900/20 text-red-400' : ''}
                        `}>
                          {service.status}
                        </span>
                        <button className="p-1 hover:bg-white/10 rounded transition-colors">
                          <X className="w-4 h-4 text-white/40" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Save Button */}
              <div className="pt-4 border-t border-white/10">
                <button className="w-full px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold">
                  Save Configuration
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
