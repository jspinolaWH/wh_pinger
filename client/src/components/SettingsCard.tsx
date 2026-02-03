import { Settings, Clock, Volume2, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SettingsCard() {
  return (
    <Link to="/config" className="rounded-lg border border-white/10 bg-black/40 backdrop-blur-sm p-3 w-auto hover:bg-white/5 transition-colors cursor-pointer block">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold">Configuration API</h3>
      </div>

      <div className="flex gap-6">
        {/* Backend Connection */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wifi className="w-3 h-3 text-blue-400" />
            <div className="text-xs text-white/60">Backend</div>
          </div>
          <div className="text-xs font-mono text-white/80">
            localhost:3000
          </div>
        </div>

        {/* Check Intervals */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3 h-3 text-orange-400" />
            <div className="text-xs text-white/60">Intervals</div>
          </div>
          <div className="text-xs font-mono text-white/80">
            30s / 60s
          </div>
        </div>

        {/* Thresholds */}
        <div>
          <div className="text-xs text-white/60 mb-1.5">Thresholds</div>
          <div className="flex gap-2 text-xs font-mono text-white/80">
            <span>200</span>
            <span>500</span>
            <span>1000ms</span>
          </div>
        </div>

        {/* Audio Alerts */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Volume2 className="w-3 h-3 text-green-400" />
            <div className="text-xs text-white/60">Audio</div>
          </div>
          <div className="text-xs">
            <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
              ON
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}