'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MetricsCards from './MetricsCards';
import SolarProductionChart from './SolarProductionChart';
import BatteryStatus from './BatteryStatus';
import WeatherWidget from './WeatherWidget';
import EnergyFlowDiagram from './EnergyFlowDiagram';
import PredictionsPanel from './PredictionsPanel';
import {
  SolarData,
  BatteryStatus as BatteryStatusType,
  SystemMetrics,
  EnergyFlow,
  WeatherData,
  Prediction,
  Alert,
  SystemConfig,
  User,
  BlackoutSchedule,
} from '@/types';
import { RefreshCw, Loader2 } from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [solarData, setSolarData] = useState<{
    current: SolarData;
    historical: SolarData[];
    battery: BatteryStatusType;
    metrics: SystemMetrics;
    energyFlow: EnergyFlow;
    config: SystemConfig;
  } | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const [predictionsData, setPredictionsData] = useState<{
    predictions: Prediction[];
    alerts: Alert[];
    recommendations: string[];
    battery: BatteryStatusType;
    timeline: SolarData[];
    weather?: WeatherData;
    config: SystemConfig;
    blackouts?: BlackoutSchedule[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch all data
  const fetchData = async () => {
    try {
      const [solarRes, weatherRes, predictionsRes] = await Promise.all([
        fetch('/api/solar'),
        fetch('/api/weather'),
        fetch('/api/predictions'),
      ]);

      const solar = await solarRes.json();
      const weather = await weatherRes.json();
      const predictions = await predictionsRes.json();

      setSolarData(solar);
      setWeatherData(weather);
      setPredictionsData(predictions);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 60 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !solarData || !weatherData || !predictionsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Cargando Gemelo Digital...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-1">
                ⚡ Gemelo Digital - Microrred Solar
              </h1>
              <p className="text-sm text-gray-400">
                Planeación energética con proyecciones meteo • sin telemetría directa
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/configuracion"
                className="hidden sm:inline-flex items-center rounded-lg border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-400/20 transition-colors"
              >
                Configurar equipos
              </Link>
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-xs text-gray-500">Operador</p>
                <p className="text-sm font-semibold text-gray-200">
                  {user.name ?? user.email}
                </p>
                <p className="text-[10px] uppercase text-gray-500 tracking-wide">
                  Rol: {user.role}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Última actualización</p>
                <p className="text-sm font-semibold text-gray-300">
                  {lastUpdate.toLocaleTimeString('es-ES')}
                </p>
              </div>
              <button
                onClick={fetchData}
                className="p-3 bg-green-400/10 border border-green-400/20 rounded-lg hover:bg-green-400/20 transition-colors group"
                title="Actualizar proyecciones"
              >
                <RefreshCw className="w-5 h-5 text-green-400 group-hover:rotate-180 transition-transform duration-500" />
              </button>
              <button
                onClick={onLogout}
                className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="sm:hidden px-6 pt-4">
        <p className="text-sm font-semibold text-white">
          {user.name ?? user.email}
        </p>
        <p className="text-[11px] uppercase text-gray-500 tracking-wide">
          Rol: {user.role}
        </p>
      </div>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="mb-8">
          <MetricsCards metrics={solarData.metrics} />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Production Chart */}
            <SolarProductionChart data={solarData.historical} />

            {/* Energy Flow Diagram */}
            <EnergyFlowDiagram
              energyFlow={solarData.energyFlow}
              production={solarData.current.production}
              consumption={solarData.current.consumption}
              batteryLevel={solarData.battery.chargeLevel}
            />
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-6">
            {/* Battery Status */}
            <BatteryStatus battery={solarData.battery} />

            {/* Weather Widget */}
            <WeatherWidget weather={weatherData} />
          </div>
        </div>

        {/* Predictions Panel - Full Width */}
        <div>
          <PredictionsPanel
            predictions={predictionsData.predictions}
            alerts={predictionsData.alerts}
            recommendations={predictionsData.recommendations}
            weather={weatherData}
            batteryProjection={predictionsData.battery}
            config={solarData.config}
            blackouts={predictionsData.blackouts}
          />
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-6 bg-gray-900/30 border border-gray-800 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Capacidad Instalada</p>
              <p className="text-lg font-bold text-white">
                {solarData.config.solar.capacityKw.toFixed(1)} kW
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Almacenamiento</p>
              <p className="text-lg font-bold text-white">
                {solarData.config.battery.capacityKwh.toFixed(1)} kWh
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Producción estimada (24h)</p>
              <p className="text-lg font-bold text-green-400">
                ≈{solarData.metrics.dailyProduction.toFixed(1)} kWh
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">CO₂ evitado (estimado)</p>
              <p className="text-lg font-bold text-emerald-400">
                ≈{solarData.metrics.co2Avoided.toFixed(1)} kg
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500 text-center">
            Todos los valores energéticos representan escenarios proyectados con datos climáticos de referencia y capacidades nominales Felicity.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900/50 mt-12">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Gemelo Digital de Microrred Fotovoltaica • Enfoque de planificación y predicción</p>
            <p className="mt-1 text-xs">
              Proyecciones alimentadas por clima en vivo y ficha técnica de paneles Felicity. Sin mediciones directas de campo.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
