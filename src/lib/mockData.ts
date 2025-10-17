import { SolarData, WeatherData, DayForecast, BatteryStatus, WeatherCondition, Prediction } from '@/types';
import { format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// System configuration
const SOLAR_CAPACITY = 50; // kW
const BATTERY_CAPACITY = 100; // kWh
const BASE_CONSUMPTION_DAY = 35; // kW average during day
const BASE_CONSUMPTION_NIGHT = 18; // kW average during night

export const SOLAR_CAPACITY_KW = SOLAR_CAPACITY;
export const BATTERY_CAPACITY_KWH = BATTERY_CAPACITY;

/**
 * Generate realistic solar production following a Gaussian curve
 * Peak production at solar noon (12:00-14:00)
 */
function generateSolarProduction(hour: number, solarRadiation: number, cloudCover: number): number {
  // Gaussian curve centered at 13:00 (1 PM)
  const peakHour = 13;
  const sigma = 3.5; // Standard deviation for curve width

  // Calculate base production using Gaussian distribution
  const gaussian = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(sigma, 2)));

  // Apply solar radiation factor (0-1000 W/m²)
  const radiationFactor = solarRadiation / 1000;

  // Apply cloud cover penalty (each 10% clouds reduces 5% production)
  const cloudPenalty = 1 - (cloudCover / 100) * 0.5;

  // Calculate production
  let production = SOLAR_CAPACITY * gaussian * radiationFactor * cloudPenalty;

  // No production at night (before 6 AM or after 8 PM)
  if (hour < 6 || hour > 20) {
    production = 0;
  }

  // Add small random variation (±5%)
  const variation = 0.95 + Math.random() * 0.1;
  production *= variation;

  return Math.max(0, Math.min(SOLAR_CAPACITY, production));
}

/**
 * Generate realistic consumption pattern
 * Higher during day (8-20h), lower at night
 */
function generateConsumption(hour: number): number {
  let baseConsumption: number;

  // Peak hours: 8-12 and 18-22
  if ((hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22)) {
    baseConsumption = BASE_CONSUMPTION_DAY * 1.2;
  }
  // Normal day hours
  else if (hour >= 6 && hour < 18) {
    baseConsumption = BASE_CONSUMPTION_DAY;
  }
  // Night hours
  else {
    baseConsumption = BASE_CONSUMPTION_NIGHT;
  }

  // Add realistic variation (±15%)
  const variation = 0.85 + Math.random() * 0.3;
  return baseConsumption * variation;
}

/**
 * Calculate battery level based on energy flows
 */
function calculateBatteryLevel(
  currentLevel: number,
  production: number,
  consumption: number,
  deltaHours: number = 1
): number {
  const surplus = production - consumption;
  const energyChange = surplus * deltaHours; // kWh
  const levelChange = (energyChange / BATTERY_CAPACITY) * 100;

  const newLevel = currentLevel + levelChange;
  return Math.max(0, Math.min(100, newLevel));
}

/**
 * Generate weather condition based on cloud cover
 */
function getWeatherCondition(cloudCover: number): WeatherCondition {
  if (cloudCover < 20) return 'sunny';
  if (cloudCover < 50) return 'partly-cloudy';
  if (cloudCover < 80) return 'cloudy';
  return 'rainy';
}

/**
 * Generate solar radiation based on time and cloud cover
 */
function generateSolarRadiation(hour: number, cloudCover: number): number {
  // Maximum radiation at solar noon
  const maxRadiation = 1000; // W/m²
  const peakHour = 13;
  const sigma = 4;

  // Gaussian curve for radiation throughout the day
  const gaussian = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(sigma, 2)));

  // Base radiation
  let radiation = maxRadiation * gaussian;

  // Apply cloud cover effect
  const cloudFactor = 1 - (cloudCover / 100) * 0.7;
  radiation *= cloudFactor;

  // No radiation at night
  if (hour < 6 || hour > 20) {
    radiation = 0;
  }

  return Math.round(radiation);
}

/**
 * Generate 24 hours of historical solar data
 */
export function buildProjectedSolarTimeline(
  predictions: Prediction[],
  initialBatteryLevel: number = 55
): SolarData[] {
  const timeline: SolarData[] = [];
  let storedEnergy = (initialBatteryLevel / 100) * BATTERY_CAPACITY;

  predictions.slice(0, 24).forEach((prediction) => {
    const production = Math.max(0, prediction.expectedProduction);
    const consumption = Math.max(0, prediction.expectedConsumption);
    const net = production - consumption;

    let gridExport = 0;
    let gridImport = 0;
    let batteryDelta = 0;

    if (net >= 0) {
      const availableCapacity = BATTERY_CAPACITY - storedEnergy;
      const energyToBattery = Math.min(net, availableCapacity);
      storedEnergy += energyToBattery;
      batteryDelta = energyToBattery;
      gridExport = net - energyToBattery;
    } else {
      const demand = Math.abs(net);
      const energyFromBattery = Math.min(storedEnergy, demand);
      storedEnergy -= energyFromBattery;
      batteryDelta = -energyFromBattery;
      gridImport = demand - energyFromBattery;
    }

    const batteryLevel = Math.max(0, Math.min(100, (storedEnergy / BATTERY_CAPACITY) * 100));
    const efficiency = Math.max(
      75,
      Math.min(96, 82 + (prediction.confidence - 70) * 0.25)
    );

    timeline.push({
      timestamp: prediction.timestamp,
      production: Math.round(production * 100) / 100,
      consumption: Math.round(consumption * 100) / 100,
      batteryLevel: Math.round(batteryLevel * 100) / 100,
      gridExport: Math.round(gridExport * 100) / 100,
      gridImport: Math.round(gridImport * 100) / 100,
      efficiency: Math.round(efficiency * 100) / 100,
      batteryDelta: Math.round(batteryDelta * 100) / 100,
    });
  });

  return timeline;
}

/**
 * Generate current weather data
 */
export function generateWeatherData(): WeatherData {
  const hour = new Date().getHours();
  const cloudCover = 15 + Math.random() * 25;
  const solarRadiation = generateSolarRadiation(hour, cloudCover);

  // Temperature follows daily pattern
  const baseTemp = 20;
  const tempVariation = 8 * Math.sin((hour - 6) * Math.PI / 12);
  const temperature = baseTemp + tempVariation + (Math.random() * 2 - 1);

  const forecast = generateForecast();

  return {
    temperature: Math.round(temperature * 10) / 10,
    solarRadiation,
    cloudCover: Math.round(cloudCover),
    humidity: Math.round(50 + Math.random() * 30),
    windSpeed: Math.round(5 + Math.random() * 15),
    forecast,
  };
}

/**
 * Generate 7-day weather forecast
 */
function generateForecast(): DayForecast[] {
  const forecast: DayForecast[] = [];
  const today = startOfDay(new Date());

  const scenarios = ['sunny', 'sunny', 'partly-cloudy', 'cloudy', 'partly-cloudy', 'sunny', 'cloudy'];

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const scenario = scenarios[i];

    let cloudCover: number;
    let avgRadiation: number;

    if (scenario === 'sunny') {
      cloudCover = 5 + Math.random() * 15;
      avgRadiation = 850 + Math.random() * 100;
    } else if (scenario === 'partly-cloudy') {
      cloudCover = 30 + Math.random() * 20;
      avgRadiation = 600 + Math.random() * 150;
    } else {
      cloudCover = 70 + Math.random() * 20;
      avgRadiation = 300 + Math.random() * 150;
    }

    // Estimate daily production (kWh)
    // Assuming 10 hours of daylight with varying intensity
    const predictedProduction = (avgRadiation / 1000) * SOLAR_CAPACITY * 8 * (1 - cloudCover / 200);

    const baseTemp = 18 + Math.random() * 8;

    forecast.push({
      date: date.toISOString(),
      dayOfWeek: format(date, 'EEEE', { locale: es }),
      maxTemp: Math.round((baseTemp + 5 + Math.random() * 3) * 10) / 10,
      minTemp: Math.round((baseTemp - 3 + Math.random() * 2) * 10) / 10,
      solarRadiation: Math.round(avgRadiation),
      cloudCover: Math.round(cloudCover),
      predictedProduction: Math.round(predictedProduction * 10) / 10,
      condition: getWeatherCondition(cloudCover),
    });
  }

  return forecast;
}

/**
 * Generate current battery status
 */
export function generateBatteryProjection(
  timeline: SolarData[],
  predictions: Prediction[]
): BatteryStatus {
  const firstEntry = timeline[0];
  const storedEnergy = firstEntry
    ? (firstEntry.batteryLevel / 100) * BATTERY_CAPACITY
    : (55 / 100) * BATTERY_CAPACITY;

  const projectedMinLevel = Math.min(...timeline.map((entry) => entry.batteryLevel));
  const projectedMaxLevel = Math.max(...timeline.map((entry) => entry.batteryLevel));
  const upcomingConsumption = predictions[0]?.expectedConsumption ?? 0;
  const autonomyHours = upcomingConsumption > 0 ? storedEnergy / upcomingConsumption : 999;
  const batteryDelta = firstEntry?.batteryDelta ?? 0;

  return {
    chargeLevel: Math.round((firstEntry?.batteryLevel ?? 55) * 100) / 100,
    capacity: BATTERY_CAPACITY,
    current: Math.round(storedEnergy * 100) / 100,
    autonomyHours: Math.round(autonomyHours * 10) / 10,
    charging: batteryDelta >= 0,
    powerFlow: Math.round(batteryDelta * 100) / 100,
    projectedMinLevel: Math.round(projectedMinLevel * 100) / 100,
    projectedMaxLevel: Math.round(projectedMaxLevel * 100) / 100,
    note: 'Estimación basada en clima y ficha técnica. No hay telemetría en vivo.',
  };
}
