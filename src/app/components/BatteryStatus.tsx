import { BatteryStatus as BatteryStatusType } from '@/types';
import { Battery, BatteryCharging, BatteryWarning, Zap } from 'lucide-react';

interface BatteryStatusProps {
  battery: BatteryStatusType;
}

export default function BatteryStatus({ battery }: BatteryStatusProps) {
  const { chargeLevel, current, capacity, autonomyHours, charging, powerFlow } = battery;

  // Determine battery color based on level
  const getColorClass = (level: number) => {
    if (level >= 70) return 'text-green-400';
    if (level >= 40) return 'text-yellow-400';
    if (level >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBgColorClass = (level: number) => {
    if (level >= 70) return 'bg-green-400';
    if (level >= 40) return 'bg-yellow-400';
    if (level >= 20) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const colorClass = getColorClass(chargeLevel);
  const bgColorClass = getBgColorClass(chargeLevel);

  // SVG circle parameters
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (chargeLevel / 100) * circumference;

  // Get appropriate icon
  const BatteryIcon = chargeLevel < 20 ? BatteryWarning : charging ? BatteryCharging : Battery;

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">
          Estado de Batería
        </h2>
        <p className="text-sm text-gray-400">
          Capacidad: {capacity} kWh
        </p>
      </div>

      <div className="flex flex-col items-center">
        {/* Circular progress indicator */}
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#1f2937"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={`${colorClass} transition-all duration-500`}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <BatteryIcon className={`w-8 h-8 ${colorClass} mb-2`} />
            <div className={`text-4xl font-extrabold ${colorClass}`}>
              {chargeLevel.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {current.toFixed(1)} kWh
            </div>
          </div>
        </div>

        {/* Battery stats */}
        <div className="w-full mt-8 space-y-3">
          {/* Charging/Discharging status */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${charging ? 'text-green-400' : 'text-orange-400'}`} />
              <span className="text-sm text-gray-300">Estado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${charging ? 'text-green-400' : 'text-orange-400'}`}>
                {charging ? 'Cargando' : powerFlow < 0 ? 'Descargando' : 'En espera'}
              </span>
              {powerFlow !== 0 && (
                <span className="text-xs text-gray-400">
                  ({Math.abs(powerFlow).toFixed(1)} kW)
                </span>
              )}
            </div>
          </div>

          {/* Autonomy */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <span className="text-sm text-gray-300">Autonomía</span>
            <span className="text-sm font-bold text-white">
              {autonomyHours >= 999 ? '∞' : `${autonomyHours.toFixed(1)} horas`}
            </span>
          </div>

          {/* Energy stored */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <span className="text-sm text-gray-300">Energía Almacenada</span>
            <span className="text-sm font-bold text-white">
              {current.toFixed(1)} / {capacity} kWh
            </span>
          </div>
        </div>

        {/* Warning indicator */}
        {chargeLevel < 20 && (
          <div className="mt-4 w-full p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
            <div className="flex items-center gap-2">
              <BatteryWarning className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 font-medium">
                Batería baja - Considere reducir consumo
              </span>
            </div>
          </div>
        )}

        {/* Fully charged indicator */}
        {chargeLevel >= 95 && (
          <div className="mt-4 w-full p-3 bg-green-400/10 border border-green-400/20 rounded-lg">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-medium">
                Batería completamente cargada
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
