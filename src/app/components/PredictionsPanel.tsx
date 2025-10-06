'use client';

import { Alert, Prediction } from '@/types';
import { AlertTriangle, Info, AlertCircle, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PredictionsPanelProps {
  predictions: Prediction[];
  alerts: Alert[];
  recommendations: string[];
}

export default function PredictionsPanel({ predictions, alerts, recommendations }: PredictionsPanelProps) {
  // Get alert icon and color
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-400/10 border-red-400/30';
      case 'warning':
        return 'bg-yellow-400/10 border-yellow-400/30';
      case 'info':
        return 'bg-blue-400/10 border-blue-400/30';
    }
  };

  // Prepare data for next 12 hours chart
  const next12Hours = predictions.slice(0, 12).map((p) => ({
    hour: `${p.hour}h`,
    producción: p.expectedProduction,
    consumo: p.expectedConsumption,
    balance: p.expectedProduction - p.expectedConsumption,
  }));

  // Custom tooltip for predictions chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-gray-300 text-sm font-semibold mb-2">
          {payload[0]?.payload.hour}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400">Producción:</span>
            <span className="text-sm font-bold text-green-400">
              {payload[0]?.value.toFixed(1)} kW
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="text-xs text-gray-400">Consumo:</span>
            <span className="text-sm font-bold text-blue-400">
              {payload[1]?.value.toFixed(1)} kW
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">
              Alertas ({alerts.length})
            </h2>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 border rounded-lg ${getAlertColor(alert.type)}`}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm mb-1">
                    {alert.title}
                  </h3>
                  <p className="text-xs text-gray-300">
                    {alert.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictions Chart */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">
            Predicción Próximas 12 Horas
          </h2>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={next12Hours}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="hour"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={{ stroke: '#4b5563' }}
              label={{ value: 'kW', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="circle"
              formatter={(value) => (
                <span className="text-gray-300 text-xs font-medium">{value}</span>
              )}
            />
            <Bar dataKey="producción" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="consumo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">
              Recomendaciones
            </h2>
          </div>

          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-green-400/5 border border-green-400/20 rounded-lg"
              >
                <div className="mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-400">
                      {index + 1}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-300 flex-1">
                  {recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Hour Quick Stats */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">
            Próxima Hora
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-400/10 rounded-lg border border-green-400/20">
            <p className="text-xs text-gray-400 mb-1">Producción Esperada</p>
            <p className="text-2xl font-bold text-green-400">
              {predictions[0]?.expectedProduction.toFixed(1)} kW
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Confianza: {predictions[0]?.confidence}%
            </p>
          </div>

          <div className="text-center p-3 bg-blue-400/10 rounded-lg border border-blue-400/20">
            <p className="text-xs text-gray-400 mb-1">Consumo Esperado</p>
            <p className="text-2xl font-bold text-blue-400">
              {predictions[0]?.expectedConsumption.toFixed(1)} kW
            </p>
          </div>

          <div className="text-center p-3 bg-purple-400/10 rounded-lg border border-purple-400/20">
            <p className="text-xs text-gray-400 mb-1">Balance Estimado</p>
            <p className={`text-2xl font-bold ${(predictions[0]?.expectedProduction - predictions[0]?.expectedConsumption) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {((predictions[0]?.expectedProduction || 0) - (predictions[0]?.expectedConsumption || 0)).toFixed(1)} kW
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
