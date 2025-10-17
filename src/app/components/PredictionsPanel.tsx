'use client';

import { Alert, Prediction } from '@/types';
import {
  AlertTriangle,
  Info,
  AlertCircle,
  CloudLightning,
  Thermometer,
  Gauge,
  Zap,
  Leaf,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface PredictionsPanelProps {
  predictions: Prediction[];
  alerts: Alert[];
  recommendations: string[];
}

const FELICITY_PANEL_RATED_KW = 0.55;
const FELICITY_PANEL_COUNT = 10;
const FELICITY_PANEL_RATED_W = FELICITY_PANEL_RATED_KW * 1000;
const MAX_BATTERY_CAPACITY_KWH = 100;
const STANDARD_IRRADIANCE = 1000; // W/m²

export default function PredictionsPanel({
  predictions,
  alerts,
  recommendations,
}: PredictionsPanelProps) {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Safe defaults in case the API returns empty arrays
  const fallbackPrediction: Prediction = predictions[0] ?? {
    timestamp: now.toISOString(),
    hour: now.getHours(),
    expectedProduction: 0,
    expectedConsumption: 0,
    confidence: 75,
  };

  const displayedPredictions = predictions.slice(0, 4);
  const averageProduction =
    predictions.reduce((acc, item) => acc + item.expectedProduction, 0) /
      (predictions.length || 1);
  const averageConsumption =
    predictions.reduce((acc, item) => acc + item.expectedConsumption, 0) /
      (predictions.length || 1);
  const estimatedBalance =
    fallbackPrediction.expectedProduction - fallbackPrediction.expectedConsumption;

  const bestHour = displayedPredictions.reduce(
    (best, item) =>
      item.expectedProduction > best.expectedProduction ? item : best,
    fallbackPrediction,
  );

  const riskHour = displayedPredictions.reduce((worst, item) => {
    const itemBalance = item.expectedProduction - item.expectedConsumption;
    const worstBalance = worst.expectedProduction - worst.expectedConsumption;
    return itemBalance < worstBalance ? item : worst;
  }, fallbackPrediction);

  const surplusEnergy = Number(
    displayedPredictions
      .reduce(
        (acc, item) =>
          acc + (item.expectedProduction - item.expectedConsumption),
        0,
      )
      .toFixed(1),
  );

  // Simulated feeds from external services
  const weatherChannelFeed = {
    provider: 'The Weather Channel Live',
    location: 'La Habana, CU',
    temperature: Number((27 + averageProduction * 0.18).toFixed(1)),
    humidity: Math.round(
      Math.min(92, Math.max(52, 68 + (averageConsumption - averageProduction) * 3)),
    ),
    windSpeed: Number(
      (11 + Math.max(0, averageConsumption - averageProduction) * 0.25).toFixed(1),
    ),
    uvIndex: Math.min(11, Math.max(1, Math.round(6 + averageProduction / 2))),
    condition:
      estimatedBalance >= 0
        ? 'Radiación favorable para generación estimada'
        : 'Nubosidad prevista que limita la captación',
    lastSync: formattedTime,
  };

  const climateGuardianFeed = {
    provider: 'ClimaLatam Insight',
    solarIrradiance: Math.round(620 + averageProduction * 35),
    cloudCover: Math.round(
      Math.min(95, Math.max(18, 45 + (averageConsumption - averageProduction) * 5)),
    ),
    rainChance: Math.round(
      Math.max(3, Math.min(70, (100 - fallbackPrediction.confidence) * 0.8)),
    ),
    airQuality: `AQI ${Math.round(34 + (averageConsumption - averageProduction) * 1.2)} • Bueno`,
    lastSync: formattedTime,
    commentary:
      fallbackPrediction.confidence > 80
        ? 'Condiciones favorables para la estimación del arreglo.'
        : 'Posibles micro-nubes en la tarde, ajustar cargas no críticas.',
  };

  const irradianceFactor = Math.min(1, climateGuardianFeed.solarIrradiance / STANDARD_IRRADIANCE);
  const temperatureLossFactor = Math.max(
    0.7,
    1 - Math.max(0, weatherChannelFeed.temperature - 25) * 0.005,
  );
  const estimatedArrayOutputKw = Number(
    (
      FELICITY_PANEL_RATED_KW *
      FELICITY_PANEL_COUNT *
      irradianceFactor *
      temperatureLossFactor
    ).toFixed(2),
  );

  const felicityPanel = {
    model: 'Felicity Solar Titan 550',
    stringsActive: 10,
    operatingTemp: Number(
      (35 + (weatherChannelFeed.temperature - 24) * 1.2).toFixed(1),
    ),
    efficiency: Number(
      (21.8 - Math.max(0, weatherChannelFeed.temperature - 30) * 0.08).toFixed(2),
    ),
    health: Math.max(93, Math.round(98 - (100 - fallbackPrediction.confidence) * 0.05)),
    estimatedOutput: estimatedArrayOutputKw,
    estimatedYield: Number(
      displayedPredictions.reduce((acc, item) => acc + item.expectedProduction, 0).toFixed(1),
    ),
    batteryCapacity: MAX_BATTERY_CAPACITY_KWH,
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-400/10 border-red-400/25';
      case 'warning':
        return 'bg-yellow-400/10 border-yellow-400/25';
      case 'info':
        return 'bg-blue-400/10 border-blue-400/25';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">
              Alertas inteligentes ({alerts.length})
            </h2>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(alert.type)}`}
              >
                <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-300">{alert.message}</p>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  {new Date(alert.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time feeds */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CloudLightning className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-bold text-white">Datos en tiempo real</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide text-sky-300/80">
                {weatherChannelFeed.provider}
              </p>
              <span className="text-[10px] text-gray-400">
                Act. {weatherChannelFeed.lastSync}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {weatherChannelFeed.condition}
            </p>
            <p className="text-xs text-gray-400 mb-4">{weatherChannelFeed.location}</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
              <div>
                <p className="text-gray-400 mb-1">Temperatura</p>
                <p className="text-lg font-semibold text-sky-300">
                  {weatherChannelFeed.temperature}°C
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Humedad</p>
                <p className="text-lg font-semibold text-sky-300">
                  {weatherChannelFeed.humidity}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Viento</p>
                <p className="text-lg font-semibold text-sky-300">
                  {weatherChannelFeed.windSpeed} km/h
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Índice UV</p>
                <p className="text-lg font-semibold text-sky-300">
                  {weatherChannelFeed.uvIndex}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide text-emerald-300/80">
                {climateGuardianFeed.provider}
              </p>
              <span className="text-[10px] text-gray-400">
                Act. {climateGuardianFeed.lastSync}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {climateGuardianFeed.commentary}
            </p>
            <p className="text-xs text-gray-400 mb-4">Analítica atmosférica extendida</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
              <div>
                <p className="text-gray-400 mb-1">Irradiancia</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {climateGuardianFeed.solarIrradiance} W/m²
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Nubosidad</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {climateGuardianFeed.cloudCover}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Prob. lluvia</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {climateGuardianFeed.rainChance}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Calidad aire</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {climateGuardianFeed.airQuality}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Felicity panel status */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white">Felicity • Panel Titan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-amber-400/25 bg-amber-400/5">
            <p className="text-xs text-amber-200/80 uppercase tracking-wide mb-2">
              Modelo operativo
            </p>
            <p className="text-lg font-semibold text-white">{felicityPanel.model}</p>
            <p className="text-xs text-gray-400 mt-1">
              Strings activos: {felicityPanel.stringsActive}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Potencia nominal: {FELICITY_PANEL_RATED_W.toFixed(0)} W · Paneles: {FELICITY_PANEL_COUNT}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-amber-400/15 bg-gray-800/40">
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Gauge className="w-4 h-4" />
              <p className="text-xs uppercase tracking-wide">Eficiencia</p>
            </div>
            <p className="text-2xl font-semibold text-white">
              {felicityPanel.efficiency.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Temp. célula: {felicityPanel.operatingTemp}°C
            </p>
          </div>
          <div className="p-4 rounded-lg border border-amber-400/15 bg-gray-800/40">
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Zap className="w-4 h-4" />
              <p className="text-xs uppercase tracking-wide">Potencial estimado</p>
            </div>
            <p className="text-2xl font-semibold text-green-400">
              {felicityPanel.estimatedOutput.toFixed(2)} kW
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Generación 4h estimada: {felicityPanel.estimatedYield.toFixed(1)} kWh
            </p>
          </div>
          <div className="p-4 rounded-lg border border-amber-400/15 bg-gray-800/40">
            <div className="flex items-center gap-2 text-amber-300 mb-2">
              <Leaf className="w-4 h-4" />
              <p className="text-xs uppercase tracking-wide">Salud</p>
            </div>
            <p className="text-2xl font-semibold text-emerald-400">
              {felicityPanel.health}%
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Capacidad batería: {felicityPanel.batteryCapacity} kWh (nominal)
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Sin telemetría en vivo de generación o batería; la estrategia depende del clima y los
          límites nominales de la instalación.
        </p>
      </div>

      {/* Simulated predictions */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Predicciones simuladas</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Estimaciones generadas a partir de clima en vivo y ficha técnica del panel;
          no representan mediciones reales de la planta.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="p-4 rounded-lg border border-purple-400/25 bg-purple-500/10">
            <p className="text-xs uppercase tracking-wide text-purple-200/80 mb-1">
              Hora más productiva
            </p>
            <p className="text-lg font-semibold text-white">
              {bestHour.hour}:00 — {bestHour.expectedProduction.toFixed(1)} kW
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Confianza: {bestHour.confidence}%
            </p>
          </div>
          <div className="p-4 rounded-lg border border-purple-400/15 bg-gray-800/40">
            <p className="text-xs uppercase tracking-wide text-purple-200/80 mb-1">
              Mayor riesgo
            </p>
            <p className="text-lg font-semibold text-white">
              {riskHour.hour}:00 —{' '}
              {(riskHour.expectedProduction - riskHour.expectedConsumption).toFixed(1)} kWh
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Ajustar cargas no críticas en este bloque.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-purple-400/15 bg-gray-800/40">
            <p className="text-xs uppercase tracking-wide text-purple-200/80 mb-1">
              Balance estimado 4h
            </p>
            <p
              className={`text-lg font-semibold ${
                surplusEnergy >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {surplusEnergy >= 0 ? '+' : ''}
              {surplusEnergy} kWh
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Basado en insumos climáticos combinados.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {displayedPredictions.map((prediction) => {
            const balance = prediction.expectedProduction - prediction.expectedConsumption;
            return (
              <div
                key={prediction.timestamp}
                className="flex items-center justify-between rounded-lg border border-purple-400/10 bg-gray-900/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {prediction.hour}:00 • Confianza {prediction.confidence}%
                  </p>
                  <p className="text-xs text-gray-400">
                    Producción estimada {prediction.expectedProduction.toFixed(1)} kW ·
                    Consumo proyectado {prediction.expectedConsumption.toFixed(1)} kW
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    balance >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {balance >= 0 ? '+' : ''}
                  {balance.toFixed(1)} kWh
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">Acciones sugeridas</h2>
          </div>
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex gap-3 rounded-lg border border-green-400/15 bg-green-400/5 px-4 py-3"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-400/20 text-xs font-semibold text-green-300">
                  {index + 1}
                </div>
                <p className="text-sm text-gray-200">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
