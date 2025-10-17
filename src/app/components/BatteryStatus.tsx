import { BatteryStatus as BatteryStatusType } from '@/types';
import { Battery, ArrowUpRight, ArrowDownLeft, ShieldAlert, Gauge, Info } from 'lucide-react';

interface BatteryStatusProps {
  battery: BatteryStatusType;
}

export default function BatteryStatus({ battery }: BatteryStatusProps) {
  const {
    chargeLevel,
    current,
    capacity,
    autonomyHours,
    charging,
    powerFlow,
    projectedMinLevel,
    projectedMaxLevel,
    note,
  } = battery;

  const flowLabel = charging
    ? 'Carga prevista'
    : powerFlow < 0
      ? 'Descarga prevista'
      : 'Sin flujo estimado';
  const flowClass = charging
    ? 'text-green-400 bg-green-400/10 border-green-400/20'
    : powerFlow < 0
      ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
      : 'text-gray-400 bg-gray-800/60 border-gray-700';
  const flowIcon = charging ? ArrowUpRight : powerFlow < 0 ? ArrowDownLeft : Gauge;
  const FlowIcon = flowIcon;
  const formattedAutonomy =
    autonomyHours >= 999 ? 'N/D' : `${autonomyHours.toFixed(1)} h`;

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
      <div className="mb-6 flex items-start justify-between">
        <h2 className="text-2xl font-bold text-white mb-1">
          Planificación de batería
        </h2>
        <span className="text-[11px] uppercase tracking-wide text-gray-500 bg-gray-800/80 border border-gray-700 px-2 py-1 rounded">
          Estimación
        </span>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-gray-800/60 border border-gray-700 rounded-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10 border border-emerald-400/20">
            <Battery className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Capacidad nominal
            </p>
            <p className="text-lg font-semibold text-white">
              {capacity} kWh
            </p>
            <p className="text-xs text-gray-500">
              Punto de partida asumido: ≈{chargeLevel.toFixed(1)}% ({current.toFixed(1)} kWh)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 border border-gray-800 rounded-lg bg-gray-900/40">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Rango proyectado (24h)
            </p>
            <p className="text-sm font-semibold text-gray-300">
              {projectedMinLevel?.toFixed(1)}% → {projectedMaxLevel?.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Calculado con irradiancia prevista
            </p>
          </div>
          <div className="p-3 border border-gray-800 rounded-lg bg-gray-900/40">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Autonomía estimada bajo carga actual
            </p>
            <p className="text-sm font-semibold text-gray-300">
              {formattedAutonomy}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Basado en consumo proyectado inmediato
            </p>
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 ${flowClass}`}
        >
          <div className="flex items-center gap-2">
            <FlowIcon className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wide">{flowLabel}</span>
          </div>
          <span className="text-sm font-semibold">
            {Math.abs(powerFlow).toFixed(1)} kW
          </span>
        </div>

        <div className="flex items-start gap-3 text-xs text-gray-400 bg-gray-800/40 border border-gray-700 rounded-lg p-3">
          <Info className="w-4 h-4 mt-0.5 text-gray-500" />
          <div className="space-y-1">
            <p>
              {note ??
                'Sin telemetría de estado de carga. Se utiliza un punto de partida asumido junto con el pronóstico climático para esta proyección.'}
            </p>
            {projectedMinLevel !== undefined && projectedMinLevel < 25 && (
              <div className="flex items-center gap-2 text-red-300">
                <ShieldAlert className="w-4 h-4" />
                <span>El nivel estimado podría descender por debajo de 25%. Considere respaldo.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
