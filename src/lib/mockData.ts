import { SolarData, WeatherData, DayForecast, BatteryStatus, WeatherCondition } from '@/types';
import { addHours, format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// System configuration
const SOLAR_CAPACITY = 50; // kW
const BATTERY_CAPACITY = 100; // kWh
const BASE_CONSUMPTION_DAY = 35; // kW average during day
const BASE_CONSUMPTION_NIGHT = 18; // kW average during night

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
export function generateHistoricalData(scenario: 'sunny' | 'cloudy' | 'variable' = 'sunny'): SolarData[] {
  const data: SolarData[] = [];
  const now = new Date();
  let batteryLevel = 60; // Start at 60%

  for (let i = 23; i >= 0; i--) {
    const timestamp = addHours(now, -i);
    const hour = timestamp.getHours();

    // Determine cloud cover based on scenario
    let cloudCover: number;
    if (scenario === 'sunny') {
      cloudCover = 5 + Math.random() * 10;
    } else if (scenario === 'cloudy') {
      cloudCover = 70 + Math.random() * 20;
    } else {
      // Variable: changes every few hours
      cloudCover = (Math.floor(hour / 3) % 2 === 0) ? 10 + Math.random() * 20 : 60 + Math.random() * 30;
    }

    const solarRadiation = generateSolarRadiation(hour, cloudCover);
    const production = generateSolarProduction(hour, solarRadiation, cloudCover);
    const consumption = generateConsumption(hour);

    // Update battery level
    batteryLevel = calculateBatteryLevel(batteryLevel, production, consumption, 1);

    // Calculate grid flows
    const balance = production - consumption;
    const gridExport = Math.max(0, balance);
    const gridImport = Math.max(0, -balance);

    // Calculate system efficiency (decreases with high temperature and age)
    const baseEfficiency = 95;
    const tempLoss = hour >= 12 && hour <= 16 ? 2 : 0; // Loss during hot hours
    const efficiency = baseEfficiency - tempLoss + (Math.random() * 2 - 1);

    data.push({
      timestamp: timestamp.toISOString(),
      production: Math.round(production * 100) / 100,
      consumption: Math.round(consumption * 100) / 100,
      batteryLevel: Math.round(batteryLevel * 100) / 100,
      gridExport: Math.round(gridExport * 100) / 100,
      gridImport: Math.round(gridImport * 100) / 100,
      efficiency: Math.round(efficiency * 100) / 100,
    });
  }

  return data;
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
export function generateBatteryStatus(currentLevel: number, production: number, consumption: number): BatteryStatus {
  const current = (currentLevel / 100) * BATTERY_CAPACITY;
  const powerFlow = production - consumption;
  const charging = powerFlow > 0;

  // Calculate autonomy hours (how long battery can sustain current load)
  const autonomyHours = consumption > 0 ? current / consumption : 999;

  return {
    chargeLevel: Math.round(currentLevel * 100) / 100,
    capacity: BATTERY_CAPACITY,
    current: Math.round(current * 100) / 100,
    autonomyHours: Math.round(autonomyHours * 10) / 10,
    charging,
    powerFlow: Math.round(powerFlow * 100) / 100,
  };
}

/**
 * Get current solar data (most recent from historical)
 */
export function getCurrentSolarData(): SolarData {
  const historical = generateHistoricalData('sunny');
  return historical[historical.length - 1];
}
