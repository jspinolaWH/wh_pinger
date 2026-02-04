import { useState, useEffect } from 'react';
import { Settings, Clock, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ConfigData {
  heartbeatIntervals: {
    critical: number;
    standard: number;
    low: number;
  };
  thresholds: {
    healthy: number;
    warning: number;
    critical: number;
  };
  audio: {
    enabled: boolean;
    volume: number;
  };
}

export function SettingsCard() {
  const [config, setConfig] = useState<ConfigData>({
    heartbeatIntervals: {
      critical: 2,
      standard: 5,
      low: 5,
    },
    thresholds: {
      healthy: 750,
      warning: 1500,
      critical: 1500,
    },
    audio: {
      enabled: true,
      volume: 70,
    },
  });

  // Get current hostname and protocol dynamically
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const configUrl = `${protocol}//${hostname}:${window.location.port}/config`;

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load all configurations in parallel
        const [servicesRes, thresholdsRes, audioRes] = await Promise.all([
          fetch('/api/config/services'),
          fetch('/api/config/thresholds'),
          fetch('/api/config/audio')
        ]);

        if (servicesRes.ok && thresholdsRes.ok && audioRes.ok) {
          const servicesData = await servicesRes.json();
          const thresholdsData = await thresholdsRes.json();
          const audioData = await audioRes.json();
          
          const services = servicesData.services || [];
          
          // Extract heartbeat intervals from services
          const criticalService = services.find((s: any) => s.tier === 'critical');
          const standardService = services.find((s: any) => s.tier === 'standard');
          const lowService = services.find((s: any) => s.tier === 'low');
          
          setConfig({
            heartbeatIntervals: {
              critical: criticalService?.heartbeatInterval || 2,
              standard: standardService?.heartbeatInterval || 5,
              low: lowService?.heartbeatInterval || 5,
            },
            thresholds: {
              healthy: thresholdsData.default.healthy.max,
              warning: thresholdsData.default.warning.max,
              critical: thresholdsData.default.critical.min,
            },
            audio: {
              enabled: audioData.enabled,
              volume: audioData.volume,
            },
          });
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    loadConfig();
    
    // Poll for config changes every 5 seconds
    const interval = setInterval(loadConfig, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Link to="/config" className="rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm p-3 w-auto hover:bg-white/5 transition-colors cursor-pointer block">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold">Configuration</h3>
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* Config URL */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Settings className="w-3 h-3 text-purple-400" />
            <div className="text-xs text-white/60">Config Page</div>
          </div>
          <div className="text-xs font-mono text-white/80">
            {configUrl}
          </div>
        </div>

        {/* Check Intervals */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3 h-3 text-orange-400" />
            <div className="text-xs text-white/60">Intervals</div>
          </div>
          <div className="text-xs font-mono text-white/80">
            {config.heartbeatIntervals.critical}s / {config.heartbeatIntervals.standard}s / {config.heartbeatIntervals.low}s
          </div>
        </div>

        {/* Thresholds */}
        <div>
          <div className="text-xs text-white/60 mb-1.5">Thresholds</div>
          <div className="flex gap-2 text-xs font-mono text-white/80">
            <span>{config.thresholds.healthy}</span>
            <span>{config.thresholds.warning}</span>
            <span>{config.thresholds.critical}ms</span>
          </div>
        </div>

        {/* Audio Alerts */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Volume2 className="w-3 h-3 text-green-400" />
            <div className="text-xs text-white/60">Audio</div>
          </div>
          <div className="text-xs">
            <span className={`px-1.5 py-0.5 rounded border ${
              config.audio.enabled 
                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            }`}>
              {config.audio.enabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}