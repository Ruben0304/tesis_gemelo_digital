'use client';

import {
  Alert,
  Prediction,
  WeatherData,
  BatteryStatus,
  SystemConfig,
  BlackoutSchedule,
} from '@/types';
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
  Power,
} from 'lucide-react';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/systemDefaults';

interface PredictionsPanelProps {
  predictions: Prediction[];
  alerts: Alert[];
  recommendations: string[];
  weather?: WeatherData | null;
  batteryProjection?: BatteryStatus;
  config?: SystemConfig;
  blackouts?: BlackoutSchedule[];
}

const STANDARD_IRRADIANCE = 1000; // W/m²

export default function PredictionsPanel({
  predictions,
  alerts,
  recommendations,
  weather,
  batteryProjection,
  config,
  blackouts = [],
}: PredictionsPanelProps) {
  const resolvedConfig = config ?? DEFAULT_SYSTEM_CONFIG;
  const panelRatedKw = resolvedConfig.solar.panelRatedKw;
  const panelCount = resolvedConfig.solar.panelCount;
  const panelStrings = resolvedConfig.solar.strings ?? panelCount;
  const panelEfficiencyPercent = resolvedConfig.solar.panelEfficiencyPercent ?? 21.8;
  const batteryCapacityKwh = resolvedConfig.battery.capacityKwh;
  const felicityPanelRatedW = panelRatedKw * 1000;

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

  const toTitle = (value?: string | null) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : undefined;
  const describeClouds = (cloudCover?: number) => {
    if (cloudCover === undefined) return 'Condición no disponible';
    if (cloudCover < 20) return 'Cielo despejado';
    if (cloudCover < 50) return 'Parcialmente nublado';
    if (cloudCover < 80) return 'Nublado';
    return 'Cobertura casi total';
  };

  const weatherTimestamp = weather?.lastUpdated ? new Date(weather.lastUpdated) : now;
  const weatherTime = weatherTimestamp.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const blackoutEntries = blackouts
    .flatMap((schedule) =>
      schedule.intervals.map((interval, index) => {
        const start = new Date(interval.start);
        const end = new Date(interval.end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
          return null;
        }
        const duration =
          interval.durationMinutes ??
          Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
        const intensity = duration >= 180 ? 'severo' : 'moderado';
        return {
          id: `${schedule._id ?? schedule.date}-${index}`,
          start,
          end,
          duration,
          intensity,
          location: schedule.municipality ?? schedule.province,
          note: schedule.notes,
        };
      })
    )
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const activeBlackout = blackoutEntries.find(
    (entry) => entry.start <= now && entry.end > now
  );
  const upcomingBlackouts = blackoutEntries.filter((entry) => entry.end > now).slice(0, 4);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDay = (date: Date) =>
    date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });

  const observedFeed = weather
    ? {
        provider: weather.provider ?? 'OpenWeather • One Call 3.0',
        location: weather.locationName ?? resolvedConfig.location.name,
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        solarRadiation: weather.solarRadiation,
        cloudCover: weather.cloudCover,
        condition:
          toTitle(weather.description) ??
          describeClouds(weather.cloudCover),
        lastSync: weatherTime,
      }
    : {
        provider: 'Fuente climática simulada',
        location: resolvedConfig.location.name,
        temperature: Number((27 + averageProduction * 0.18).toFixed(1)),
        humidity: Math.round(
          Math.min(92, Math.max(52, 68 + (averageConsumption - averageProduction) * 3)),
        ),
        windSpeed: Number(
          (11 + Math.max(0, averageConsumption - averageProduction) * 0.25).toFixed(1),
        ),
        solarRadiation: Math.round(620 + averageProduction * 35),
        cloudCover: Math.round(
          Math.min(95, Math.max(18, 45 + (averageConsumption - averageProduction) * 5)),
        ),
        condition:
          estimatedBalance >= 0
            ? 'Radiación favorable para generación estimada'
            : 'Nubosidad prevista que limita la captación',
        lastSync: formattedTime,
      };

  const todayForecast = weather?.forecast?.[0];
  const tomorrowForecast = weather?.forecast?.[1];

  const extendedFeed = weather
    ? {
        provider: 'Pronóstico extendido',
        solarIrradiance: todayForecast?.solarRadiation ?? observedFeed.solarRadiation ?? 0,
        cloudCover: todayForecast?.cloudCover ?? weather.cloudCover ?? 0,
        rainChance: Math.min(95, Math.round((todayForecast?.cloudCover ?? 0) * 1.1)),
        airQuality: `Estimado por nubosidad • ${Math.round(
          30 + (todayForecast?.cloudCover ?? weather.cloudCover ?? 0) * 0.4,
        )}`,
        lastSync: weatherTime,
        commentary: todayForecast
          ? `${toTitle(todayForecast.dayOfWeek)}: ${describeClouds(
              todayForecast.cloudCover,
            )}, producción prevista ≈${todayForecast.predictedProduction.toFixed(0)} kWh.`
          : 'Predicción basada en promedio climatológico local.',
      }
    : {
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

  const irradianceFactor = Math.min(
    1,
    (extendedFeed.solarIrradiance ?? STANDARD_IRRADIANCE / 2) / STANDARD_IRRADIANCE,
  );
  const temperatureLossFactor = Math.max(
    0.7,
    1 - Math.max(0, (observedFeed.temperature ?? 25) - 25) * 0.005,
  );
  const estimatedArrayOutputKw = Number(
    (
      panelRatedKw *
      panelCount *
      irradianceFactor *
      temperatureLossFactor
    ).toFixed(2),
  );

  const temperaturePenalty = Math.max(0, (observedFeed.temperature ?? 30) - 30) * 0.08;
  const effectiveEfficiency = Math.max(0, panelEfficiencyPercent - temperaturePenalty);

  const felicityPanel = {
    model: 'Felicity Solar Titan 550',
    stringsActive: panelStrings,
    operatingTemp: Number(
      (35 + ((observedFeed.temperature ?? 24) - 24) * 1.2).toFixed(1),
    ),
    efficiency: Number(effectiveEfficiency.toFixed(2)),
    health: Math.max(93, Math.round(98 - (100 - fallbackPrediction.confidence) * 0.05)),
    estimatedOutput: estimatedArrayOutputKw,
    estimatedYield: Number(
      displayedPredictions.reduce((acc, item) => acc + item.expectedProduction, 0).toFixed(1),
    ),
    batteryCapacity: batteryCapacityKwh,
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

      {/* Planned Blackouts */}
      {blackoutEntries.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Power className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-white">
              Apagones programados ({blackoutEntries.length})
            </h2>
          </div>
          {activeBlackout ? (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-red-200">
                Apagón en curso · {formatDay(activeBlackout.start)} {formatTime(activeBlackout.start)} –{' '}
                {formatTime(activeBlackout.end)}
              </p>
              <p className="text-xs text-red-100/80 mt-1">
                Intensidad {activeBlackout.intensity}. Duración estimada {activeBlackout.duration} min.
                {activeBlackout.location && ` • Zona ${activeBlackout.location}`}
              </p>
              {activeBlackout.note && (
                <p className="text-xs text-red-100/70 mt-1">{activeBlackout.note}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-4">
              No hay apagones activos ahora. Revise las próximas interrupciones planificadas.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingBlackouts.length === 0 ? (
              <p className="text-xs text-gray-400 col-span-full">
                No hay apagones planificados en las próximas 48 horas.
              </p>
            ) : (
              upcomingBlackouts.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-red-400/25 bg-red-500/5 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-white">
                    {formatDay(entry.start)} • {formatTime(entry.start)} – {formatTime(entry.end)}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Duración {entry.duration} min · Intensidad {entry.intensity}
                  </p>
                  {entry.location && (
                    <p className="text-xs text-gray-400 mt-1">
                      Zona: {entry.location}
                    </p>
                  )}
                  {entry.note && (
                    <p className="text-xs text-gray-400 mt-1">
                      {entry.note}
                    </p>
                  )}
                </div>
              ))
            )}
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
                {observedFeed.provider}
              </p>
              <span className="text-[10px] text-gray-400">
                Act. {observedFeed.lastSync}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {observedFeed.condition}
            </p>
            <p className="text-xs text-gray-400 mb-4">{observedFeed.location}</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
              <div>
                <p className="text-gray-400 mb-1">Temperatura</p>
                <p className="text-lg font-semibold text-sky-300">
                  {observedFeed.temperature !== undefined ? `${observedFeed.temperature.toFixed(1)}°C` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Humedad</p>
                <p className="text-lg font-semibold text-sky-300">
                  {observedFeed.humidity !== undefined ? `${observedFeed.humidity}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Viento</p>
                <p className="text-lg font-semibold text-sky-300">
                  {observedFeed.windSpeed !== undefined ? `${observedFeed.windSpeed} km/h` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Rad. Solar</p>
                <p className="text-lg font-semibold text-sky-300">
                  {observedFeed.solarRadiation !== undefined ? `${observedFeed.solarRadiation} W/m²` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide text-emerald-300/80">
                {extendedFeed.provider}
              </p>
              <span className="text-[10px] text-gray-400">
                Act. {extendedFeed.lastSync}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {extendedFeed.commentary}
            </p>
            <p className="text-xs text-gray-400 mb-4">Analítica atmosférica extendida</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
              <div>
                <p className="text-gray-400 mb-1">Irradiancia</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {extendedFeed.solarIrradiance} W/m²
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Nubosidad</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {extendedFeed.cloudCover}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Prob. lluvia</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {extendedFeed.rainChance}%
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Calidad aire</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {extendedFeed.airQuality}
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
              Potencia nominal: {felicityPanelRatedW.toFixed(0)} W · Paneles: {panelCount}
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
          {batteryProjection && (
            <>
              {' '}
              Rango estimado 24h: {batteryProjection.projectedMinLevel?.toFixed(0)}% –{' '}
              {batteryProjection.projectedMaxLevel?.toFixed(0)}%.
            </>
          )}
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
            const impact = prediction.blackoutImpact;
            const cardClasses = impact
              ? 'flex items-center justify-between rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3'
              : 'flex items-center justify-between rounded-lg border border-purple-400/10 bg-gray-900/60 px-4 py-3';
            const intervalStart = impact ? new Date(impact.intervalStart) : null;
            const intervalEnd = impact ? new Date(impact.intervalEnd) : null;
            return (
              <div key={prediction.timestamp} className={cardClasses}>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {prediction.hour}:00 • Confianza {prediction.confidence}%
                  </p>
                  <p className="text-xs text-gray-400">
                    Producción estimada {prediction.expectedProduction.toFixed(1)} kW ·
                    Consumo proyectado {prediction.expectedConsumption.toFixed(1)} kW
                  </p>
                  {impact && intervalStart && intervalEnd && (
                    <p className="text-xs text-red-200 mt-1">
                      Apagón {impact.intensity} {formatTime(intervalStart)} – {formatTime(intervalEnd)} ·
                      Consumo reducido al {(impact.loadFactor * 100).toFixed(0)}%
                      {impact.note ? ` • ${impact.note}` : ''}
                    </p>
                  )}
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
