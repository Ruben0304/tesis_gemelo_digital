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



  return (
    <div className="space-y-6">
      {/* Alerts Section */}


      {blackoutEntries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Power className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">
              Apagones programados ({blackoutEntries.length})
            </h2>
          </div>
          {activeBlackout ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-600">
                Apagón en curso · {formatDay(activeBlackout.start)} {formatTime(activeBlackout.start)} –{' '}
                {formatTime(activeBlackout.end)}
              </p>
              <p className="text-xs text-red-500 mt-1">
                Intensidad {activeBlackout.intensity}. Duración estimada {activeBlackout.duration} min.
                {activeBlackout.location && ` • Zona ${activeBlackout.location}`}
              </p>
              {activeBlackout.note && (
                <p className="text-xs text-red-500/80 mt-1">{activeBlackout.note}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600 mb-4">
              No hay apagones activos ahora. Revise las próximas interrupciones planificadas.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingBlackouts.length === 0 ? (
              <p className="text-xs text-gray-600 col-span-full">
                No hay apagones planificados en las próximas 48 horas.
              </p>
            ) : (
              upcomingBlackouts.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDay(entry.start)} • {formatTime(entry.start)} – {formatTime(entry.end)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Duración {entry.duration} min · Intensidad {entry.intensity}
                  </p>
                  {entry.location && (
                    <p className="text-xs text-gray-600 mt-1">
                      Zona: {entry.location}
                    </p>
                  )}
                  {entry.note && (
                    <p className="text-xs text-gray-600 mt-1">
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
      {/* <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
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
      </div> */}

      {/* Felicity panel status */}
      {/* <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
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
      </div> */}



      {/* Recommendations */}
      {/* {recommendations.length > 0 && (
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
      )} */}
    </div>
  );
}
