'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import MetricsCards from './MetricsCards';
import SolarProductionChart from './SolarProductionChart';
import BatteryStatus from './BatteryStatus';
import WeatherToday from './WeatherToday';
import WeatherForecast from './WeatherForecast';
import PredictionsPanel from './PredictionsPanel';
import FlujoEnergia from './FlujoEnergia';
import DevicesView from './DevicesView';
import FloatingBottomNav from './FloatingBottomNav';
import SolarStatsView from './SolarStatsView';
import {
  SolarData,
  BatteryStatus as BatteryStatusType,
  SystemMetrics,
  WeatherData,
  Prediction,
  Alert,
  SystemConfig,
  User,
  BlackoutSchedule,
  SolarPanelConfig,
  BatteryConfig,
  EnergyFlow,
} from '@/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { executeQuery } from '@/lib/graphql-client';

const DASHBOARD_QUERY = `
  query DashboardData {
    solar {
      timestamp
      mode
      current {
        timestamp
        production
        consumption
        batteryLevel
        gridExport
        gridImport
        efficiency
        batteryDelta
      }
      historical {
        timestamp
        production
        consumption
        batteryLevel
        gridExport
        gridImport
        efficiency
        batteryDelta
      }
      battery {
        chargeLevel
        capacity
        current
        autonomyHours
        charging
        powerFlow
        projectedMinLevel
        projectedMaxLevel
        note
      }
      metrics {
        currentProduction
        currentConsumption
        energyBalance
        systemEfficiency
        dailyProduction
        dailyConsumption
        co2Avoided
      }
      energyFlow {
        solarToBattery
        solarToLoad
        solarToGrid
        batteryToLoad
        gridToLoad
      }
      weather {
        temperature
        solarRadiation
        cloudCover
        humidity
        windSpeed
        provider
        locationName
        lastUpdated
        description
        forecast {
          date
          dayOfWeek
          maxTemp
          minTemp
          solarRadiation
          cloudCover
          predictedProduction
          condition
        }
      }
      config {
        location { lat lon name }
        solar {
          capacityKw
          panelRatedKw
          panelCount
          strings
          panelEfficiencyPercent
          panelAreaM2
          spec {
            _id
            manufacturer
            model
            ratedPowerKw
            quantity
            tiltDegrees
            orientation
            createdAt
            updatedAt
          }
        }
        battery {
          capacityKwh
          moduleCapacityKwh
          moduleCount
          maxDepthOfDischargePercent
          chargeRateKw
          dischargeRateKw
          efficiencyPercent
          spec {
            _id
            manufacturer
            model
            capacityKwh
            quantity
            createdAt
            updatedAt
          }
        }
      }
    }
    weather {
      temperature
      solarRadiation
      cloudCover
      humidity
      windSpeed
      provider
      locationName
      lastUpdated
      description
      forecast {
        date
        dayOfWeek
        maxTemp
        minTemp
        solarRadiation
        cloudCover
        predictedProduction
        condition
      }
    }
    predictions {
      predictions {
        timestamp
        hour
        expectedProduction
        expectedConsumption
        confidence
        blackoutImpact {
          intervalStart
          intervalEnd
          loadFactor
          productionFactor
          intensity
          note
        }
      }
      alerts {
        id
        type
        title
        message
        timestamp
      }
      recommendations
      battery {
        chargeLevel
        capacity
        current
        autonomyHours
        charging
        powerFlow
        projectedMinLevel
        projectedMaxLevel
        note
      }
      timeline {
        timestamp
        production
        consumption
        batteryLevel
        gridExport
        gridImport
        efficiency
        batteryDelta
      }
      weather {
        temperature
        solarRadiation
        cloudCover
        humidity
        windSpeed
        provider
        locationName
        lastUpdated
        description
        forecast {
          date
          dayOfWeek
          maxTemp
          minTemp
          solarRadiation
          cloudCover
          predictedProduction
          condition
        }
      }
      timestamp
      config {
        location { lat lon name }
        solar {
          capacityKw
          panelRatedKw
          panelCount
          strings
          panelEfficiencyPercent
          panelAreaM2
        }
        battery {
          capacityKwh
          moduleCapacityKwh
          moduleCount
          maxDepthOfDischargePercent
          chargeRateKw
          dischargeRateKw
          efficiencyPercent
        }
      }
      blackouts {
        _id
        date
        intervals {
          start
          end
          durationMinutes
        }
        province
        municipality
        notes
        createdAt
        updatedAt
      }
    }
    panels {
      _id
      manufacturer
      model
      ratedPowerKw
      quantity
      tiltDegrees
      orientation
      createdAt
      updatedAt
    }
    batteries {
      _id
      manufacturer
      model
      capacityKwh
      quantity
      createdAt
      updatedAt
    }
  }
`;

type MLPrediction = {
  datetime: string;
  productionKw: number;
  weather: {
    temperature2m: number;
    relativeHumidity2m: number;
    windSpeed10m: number;
    cloudCover: number;
    shortwaveRadiation: number;
  };
};

type DashboardQueryResult = {
  solar: {
    current: SolarData;
    historical: SolarData[];
    battery: BatteryStatusType;
    metrics: SystemMetrics;
    energyFlow: EnergyFlow;
    weather: WeatherData;
    config: SystemConfig;
    timestamp: string;
    mode: string;
  };
  weather: WeatherData;
  predictions: {
    predictions: Prediction[];
    alerts: Alert[];
    recommendations: string[];
    battery: BatteryStatusType;
    timeline: SolarData[];
    weather: WeatherData;
    timestamp: string;
    config: SystemConfig;
    blackouts: BlackoutSchedule[];
  };
  panels: SolarPanelConfig[];
  batteries: BatteryConfig[];
};

type MLPredictionsQueryResult = {
  mlPredictForHours: MLPrediction[];
};

// Query for ML predictions for a specific day
const ML_PREDICTIONS_QUERY = `
  query MLPredictions($date: String!, $hours: [Int!]!) {
    mlPredictForHours(date: $date, hours: $hours) {
      datetime
      productionKw
      weather {
        temperature2m
        relativeHumidity2m
        windSpeed10m
        cloudCover
        shortwaveRadiation
      }
    }
  }
`;

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

// Helper function to predict consumption based on hour (matching backend logic)
function predictConsumption(hour: number): number {
  const baseDay = 35;
  const baseNight = 18;
  if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 22)) {
    return baseDay * 1.3;
  }
  if (hour >= 6 && hour < 18) {
    return baseDay;
  }
  return baseNight;
}

// Transform ML predictions to SolarData format
function transformMLPredictionsToSolarData(mlPredictions: MLPrediction[]): SolarData[] {
  return mlPredictions.map((mlPred) => {
    const timestamp = new Date(mlPred.datetime);
    const hour = timestamp.getHours();
    const consumption = predictConsumption(hour);

    return {
      timestamp: mlPred.datetime,
      production: mlPred.productionKw,
      consumption: consumption,
      batteryLevel: 0, // Will be calculated by system
      gridExport: 0,
      gridImport: 0,
      efficiency: 85, // Default efficiency estimate
      batteryDelta: 0,
    };
  });
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [solarData, setSolarData] = useState<{
    current: SolarData;
    historical: SolarData[];
    battery: BatteryStatusType;
    metrics: SystemMetrics;
    config: SystemConfig;
    energyFlow?: EnergyFlow;
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

  const [mlPredictions, setMlPredictions] = useState<SolarData[]>([]);
  const [mlLoading, setMlLoading] = useState(false);
  const [panelConfigs, setPanelConfigs] = useState<SolarPanelConfig[]>([]);
  const [batteryConfigs, setBatteryConfigs] = useState<BatteryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeSection, setActiveSection] = useState<'overview' | 'stats' | 'devices'>('overview');

  const energyFlowData = useMemo<EnergyFlow | null>(() => {
    if (!solarData) {
      return null;
    }

    if (solarData.energyFlow) {
      return solarData.energyFlow;
    }

    const { production, consumption, gridExport, gridImport } = solarData.current;
    const batteryPower = solarData.battery.powerFlow;
    const solarToLoad = Math.min(production, consumption);
    const solarExcess = Math.max(0, production - solarToLoad);
    const batteryCharging = batteryPower > 0 ? batteryPower : 0;
    const batteryDischarging = batteryPower < 0 ? Math.abs(batteryPower) : 0;
    const solarToBattery = Math.min(solarExcess, batteryCharging);
    const solarToGrid = Math.max(gridExport, solarExcess - solarToBattery);
    const batteryToLoad = batteryDischarging;
    const gridToLoad = Math.max(
      gridImport,
      Math.max(0, consumption - solarToLoad - batteryToLoad)
    );

    return {
      solarToBattery,
      solarToLoad,
      solarToGrid,
      batteryToLoad,
      gridToLoad,
    };
  }, [solarData]);

  const flujoValores = useMemo(() => {
    if (!solarData || !energyFlowData) {
      return {
        solar: 0,
        battery: 0,
        grid: 0,
        consumo: 0,
      };
    }

    return {
      solar: Math.max(0, energyFlowData.solarToLoad),
      battery: Math.max(0, energyFlowData.batteryToLoad),
      grid: Math.max(0, energyFlowData.gridToLoad),
      consumo: Math.max(0, solarData.current.consumption),
    };
  }, [solarData, energyFlowData]);

  // Fetch ML predictions for a specific day (7am-10pm)
  const fetchMLPredictionsForDay = useCallback(async (dayOffset: number) => {
    setMlLoading(true);
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Hours from 7am to 10pm (7, 8, 9, ..., 22)
      const hours = Array.from({ length: 16 }, (_, i) => i + 7);

      const data = await executeQuery<MLPredictionsQueryResult>(
        ML_PREDICTIONS_QUERY,
        { date: dateStr, hours }
      );

      if (data.mlPredictForHours && data.mlPredictForHours.length > 0) {
        const transformedPredictions = transformMLPredictionsToSolarData(data.mlPredictForHours);
        setMlPredictions(transformedPredictions);
      } else {
        setMlPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching ML predictions:', error);
      setMlPredictions([]);
    } finally {
      setMlLoading(false);
    }
  }, []);

  // Fetch all data
  const fetchData = async () => {
    try {
      const data = await executeQuery<DashboardQueryResult>(DASHBOARD_QUERY);
      setSolarData(data.solar);
      setWeatherData(data.weather);
      setPredictionsData(data.predictions);
      setPanelConfigs(data.panels ?? []);
      setBatteryConfigs(data.batteries ?? []);

      setLastUpdate(new Date());
      setLoading(false);

      // Load ML predictions for today after main data is loaded
      await fetchMLPredictionsForDay(0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-white to-blue-100">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando Gemelo Digital...</p>
        </div>
      </div>
    );
  }

  const handleAddDevice = () => {
    setActiveSection('devices');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-100">
      {/* Header Simplificado */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Gemelo Digital - Microrred Solar
              </h1>
             
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setActiveSection('devices')}
                className="hidden sm:inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
              >
                Dispositivos
              </button>
              <button
                onClick={fetchData}
                className="p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors group"
                title="Actualizar"
              >
                <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 group-hover:rotate-180 transition-transform duration-500" />
              </button>
              <button
                onClick={onLogout}
                className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
          {/* <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{user.name ?? user.email} • {user.role}</span>
            <span>Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}</span>
          </div> */}
        </div>
      </header>

      {/* Main Content - Simplificado */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32">
        {activeSection === 'overview' && (
          <>
            {/* Flujo de Energía y Resumen del Clima */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 sm:mb-8">
              <div className="lg:col-span-1">
                <FlujoEnergia
                  values={flujoValores}
                  batteryLevel={solarData.battery.chargeLevel}
                />
              </div>
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="flex-1">
                  <WeatherToday weather={weatherData} />
                </div>
                <div className="flex-1">
                  <WeatherForecast weather={weatherData} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="lg:col-span-2">
                <SolarProductionChart
                  data={mlPredictions.length > 0 ? mlPredictions : solarData.historical}
                  useMLPredictions={mlPredictions.length > 0}
                  loading={mlLoading}
                  onDayChange={fetchMLPredictionsForDay}
                />
              </div>
              <div>
                <BatteryStatus battery={solarData.battery} />
              </div>
            </div>

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
          </>
        )}

        {activeSection === 'stats' && (
          <SolarStatsView
            timeline={solarData.historical}
            weather={weatherData}
            config={solarData.config}
          />
        )}

        {activeSection === 'devices' && (
          <DevicesView
            panels={panelConfigs}
            batteries={batteryConfigs}
            systemConfig={solarData.config}
            onRefresh={fetchData}
          />
        )}
      </main>

      <FloatingBottomNav
        active={activeSection}
        onSelect={setActiveSection}
        onAddDevice={handleAddDevice}
      />

      {/* Footer Simplificado */}
      <footer className="border-t border-gray-200 bg-white mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 text-center">
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Capacidad Solar</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {solarData.config.solar.capacityKw.toFixed(1)} kW
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Batería</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">
                {solarData.config.battery.capacityKwh.toFixed(1)} kWh
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Prod. Hoy</p>
              <p className="text-sm sm:text-lg font-bold text-green-400">
                {solarData.metrics.dailyProduction.toFixed(1)} kWh
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">CO₂ Evitado</p>
              <p className="text-sm sm:text-lg font-bold text-emerald-400">
                {solarData.metrics.co2Avoided.toFixed(1)} kg
              </p>
            </div>
          </div>
          <p className="text-center text-[10px] sm:text-xs text-gray-500">
            Datos proporcionados por Open-Meteo API • Proyecciones basadas en condiciones climáticas reales
          </p>
        </div>
      </footer>
    </div>
  );
}
