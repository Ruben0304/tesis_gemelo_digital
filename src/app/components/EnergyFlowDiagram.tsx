import { EnergyFlow } from '@/types';
import { Sun, Home, Battery, Zap, ArrowRight, Info } from 'lucide-react';

interface EnergyFlowDiagramProps {
  energyFlow: EnergyFlow;
  production: number;
  consumption: number;
  batteryLevel: number;
}

export default function EnergyFlowDiagram({
  energyFlow,
  production,
  consumption,
  batteryLevel,
}: EnergyFlowDiagramProps) {
  const { solarToBattery, solarToLoad, solarToGrid, batteryToLoad, gridToLoad } = energyFlow;
  const capacityKw = 50;

  // Flow indicator component
  const FlowIndicator = ({ value, label, color }: { value: number; label: string; color: string }) => {
    if (value === 0) return null;

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 ${color} rounded-full`}>
        <ArrowRight className="w-3 h-3" />
        <span className="text-xs font-bold">≈{value.toFixed(1)} kW</span>
        <span className="text-xs opacity-75">{label}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Flujo energético estimado
        </h2>
        <p className="text-sm text-gray-600">
          Basado en clima actual y especificaciones — próxima hora
        </p>
      </div>

      <div className="relative">
        {/* Grid layout for energy flow */}
        <div className="grid grid-cols-3 gap-8 items-center">
          {/* Solar Panel */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-center justify-center group hover:scale-110 transition-transform">
                <Sun className="w-10 h-10 text-yellow-500" />
              </div>
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                {Math.min(100, (production / capacityKw) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-700">Paneles Felicity</div>
              <div className="text-2xl font-bold text-yellow-500">≈{production.toFixed(1)} kW</div>
              <p className="text-xs text-gray-600 mt-1">Capacidad instalada: {capacityKw} kW</p>
            </div>
          </div>

          {/* Battery */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-center group hover:scale-110 transition-transform">
                <Battery className="w-10 h-10 text-blue-500" />
              </div>
              <div className="absolute -top-2 -right-2 bg-blue-400 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                {batteryLevel.toFixed(0)}%
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-700">Batería (nivel asumido)</div>
              <div className="text-lg font-bold text-blue-500">
                {solarToBattery > 0 ? `+${solarToBattery.toFixed(1)}` : batteryToLoad > 0 ? `-${batteryToLoad.toFixed(1)}` : '0'} kW
              </div>
              <p className="text-xs text-gray-600 mt-1">Flujo estimado según balance horario</p>
            </div>
          </div>

          {/* Grid */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-cyan-50 border-2 border-cyan-200 rounded-xl flex items-center justify-center group hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-cyan-500" />
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-700">Red Eléctrica</div>
              <div className="text-lg font-bold text-cyan-500">
                {solarToGrid > 0 ? `+${solarToGrid.toFixed(1)}` : gridToLoad > 0 ? `-${gridToLoad.toFixed(1)}` : '0'} kW
              </div>
              <div className="text-xs text-gray-600">
                {solarToGrid > 0 ? 'Exportación estimada' : gridToLoad > 0 ? 'Importación estimada' : 'Sin flujo previsto'}
              </div>
            </div>
          </div>
        </div>

        {/* Load/Consumption - Centered below */}
        <div className="mt-8 flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center justify-center group hover:scale-110 transition-transform">
              <Home className="w-12 h-12 text-green-500" />
            </div>
            <div className="absolute -top-2 -right-2 bg-green-400 text-gray-900 rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-sm font-semibold text-gray-700">Consumo</div>
            <div className="text-3xl font-bold text-green-500">≈{consumption.toFixed(1)} kW</div>
          </div>
        </div>

        {/* Flow arrows and labels */}
        <div className="mt-6 space-y-2">
          {solarToLoad > 0 && (
            <FlowIndicator
              value={solarToLoad}
              label="Solar → Consumo (estimado)"
              color="bg-green-500/20 text-green-400 border border-green-500/30"
            />
          )}
          {solarToBattery > 0 && (
            <FlowIndicator
              value={solarToBattery}
              label="Solar → Batería (estimado)"
              color="bg-blue-500/20 text-blue-400 border border-blue-500/30"
            />
          )}
          {solarToGrid > 0 && (
            <FlowIndicator
              value={solarToGrid}
              label="Solar → Red (estimado)"
              color="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
            />
          )}
          {batteryToLoad > 0 && (
            <FlowIndicator
              value={batteryToLoad}
              label="Batería → Consumo (estimado)"
              color="bg-purple-500/20 text-purple-400 border border-purple-500/30"
            />
          )}
          {gridToLoad > 0 && (
            <FlowIndicator
              value={gridToLoad}
              label="Red → Consumo (estimado)"
              color="bg-orange-500/20 text-orange-400 border border-orange-500/30"
            />
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Balance proyectado:</span>
          <span className={`font-bold ${production >= consumption ? 'text-green-500' : 'text-red-500'}`}>
            {production >= consumption ? 'Excedente' : 'Déficit'} ≈{Math.abs(production - consumption).toFixed(1)} kW
          </span>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <Info className="w-3.5 h-3.5 mt-0.5" />
          <span>Escenario generado a partir del pronóstico climático disponible. No existen mediciones directas de potencia o flujo en tiempo real.</span>
        </div>
      </div>
    </div>
  );
}
