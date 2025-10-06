'use client';

import { SolarData } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SolarProductionChartProps {
  data: SolarData[];
}

export default function SolarProductionChart({ data }: SolarProductionChartProps) {
  // Transform data for chart
  const chartData = data.map((item) => ({
    time: format(new Date(item.timestamp), 'HH:mm', { locale: es }),
    hour: new Date(item.timestamp).getHours(),
    producción: Number(item.production.toFixed(2)),
    consumo: Number(item.consumption.toFixed(2)),
    balance: Number((item.production - item.consumption).toFixed(2)),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-gray-300 text-sm font-semibold mb-2">
          {payload[0]?.payload.time}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400">Producción:</span>
            <span className="text-sm font-bold text-green-400">
              {payload[0]?.value} kW
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="text-xs text-gray-400">Consumo:</span>
            <span className="text-sm font-bold text-blue-400">
              {payload[1]?.value} kW
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${payload[0]?.payload.balance >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">Balance:</span>
            <span className={`text-sm font-bold ${payload[0]?.payload.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {payload[0]?.payload.balance >= 0 ? '+' : ''}{payload[0]?.payload.balance} kW
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">
          Producción vs Consumo
        </h2>
        <p className="text-sm text-gray-400">
          Últimas 24 horas
        </p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={{ stroke: '#4b5563' }}
            label={{ value: 'kW', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            formatter={(value) => (
              <span className="text-gray-300 text-sm font-medium">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="producción"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#colorProduction)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="consumo"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#colorConsumption)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-400/10 rounded-lg border border-green-400/20">
          <p className="text-xs text-gray-400 mb-1">Producción Total</p>
          <p className="text-lg font-bold text-green-400">
            {chartData.reduce((sum, d) => sum + d.producción, 0).toFixed(1)} kWh
          </p>
        </div>
        <div className="text-center p-3 bg-blue-400/10 rounded-lg border border-blue-400/20">
          <p className="text-xs text-gray-400 mb-1">Consumo Total</p>
          <p className="text-lg font-bold text-blue-400">
            {chartData.reduce((sum, d) => sum + d.consumo, 0).toFixed(1)} kWh
          </p>
        </div>
        <div className="text-center p-3 bg-emerald-400/10 rounded-lg border border-emerald-400/20">
          <p className="text-xs text-gray-400 mb-1">Balance Neto</p>
          <p className="text-lg font-bold text-emerald-400">
            {chartData.reduce((sum, d) => sum + d.balance, 0).toFixed(1)} kWh
          </p>
        </div>
      </div>
    </div>
  );
}
