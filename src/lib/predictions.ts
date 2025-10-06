import { Prediction, DayForecast, Alert } from '@/types';
import { addHours, format } from 'date-fns';

const SOLAR_CAPACITY = 50; // kW
const PANEL_EFFICIENCY = 0.20; // 20% efficiency
const PANEL_AREA = 250; // m² (50kW / 200W per m²)

/**
 * Predict solar production based on weather forecast
 * Formula: Production = Solar Radiation × Panel Area × Efficiency × Correction Factors
 */
export function predictProduction(
  solarRadiation: number,   // W/m²
  temperature: number,      // °C
  cloudCover: number,       // %
  hour: number             // Hour of day
): number {
  // Base production from solar radiation
  let production = (solarRadiation * PANEL_AREA * PANEL_EFFICIENCY) / 1000; // kW

  // Temperature correction: panels lose efficiency when hot
  // Reference temp: 25°C, coefficient: -0.4% per °C
  const tempReference = 25;
  const tempCoefficient = 0.004; // 0.4% per degree
  const tempFactor = 1 - (temperature - tempReference) * tempCoefficient;
  production *= tempFactor;

  // Cloud cover correction: each 10% clouds reduces ~5% production
  const cloudFactor = 1 - (cloudCover / 100) * 0.5;
  production *= cloudFactor;

  // Hour-based adjustment (atmospheric mass, sun angle)
  const hourFactor = getHourEfficiencyFactor(hour);
  production *= hourFactor;

  // Cap at maximum capacity
  production = Math.min(production, SOLAR_CAPACITY);

  // No production at night
  if (hour < 6 || hour > 20) {
    production = 0;
  }

  return Math.max(0, Math.round(production * 100) / 100);
}

/**
 * Get efficiency factor based on hour of day
 * Accounts for sun angle and atmospheric conditions
 */
function getHourEfficiencyFactor(hour: number): number {
  // Peak efficiency at solar noon (12-14h)
  if (hour >= 12 && hour <= 14) return 1.0;
  if (hour >= 11 && hour <= 15) return 0.95;
  if (hour >= 10 && hour <= 16) return 0.85;
  if (hour >= 8 && hour <= 17) return 0.70;
  if (hour >= 7 && hour <= 18) return 0.50;
  if (hour >= 6 && hour <= 19) return 0.30;
  return 0;
}

/**
 * Generate hourly predictions for next 24 hours
 */
export function generateHourlyPredictions(
  weatherForecast: DayForecast[]
): Prediction[] {
  const predictions: Prediction[] = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const timestamp = addHours(now, i);
    const hour = timestamp.getHours();

    // Use today's or tomorrow's forecast
    const forecast = i < 12 ? weatherForecast[0] : weatherForecast[1];

    // Estimate hourly conditions
    const solarRadiation = estimateHourlySolarRadiation(hour, forecast.solarRadiation, forecast.cloudCover);
    const temperature = estimateHourlyTemperature(hour, forecast.maxTemp, forecast.minTemp);

    const production = predictProduction(
      solarRadiation,
      temperature,
      forecast.cloudCover,
      hour
    );

    // Predict consumption based on typical patterns
    const consumption = predictConsumption(hour);

    // Calculate confidence based on forecast reliability
    const confidence = calculatePredictionConfidence(i, forecast.cloudCover);

    predictions.push({
      timestamp: timestamp.toISOString(),
      hour,
      expectedProduction: Math.round(production * 100) / 100,
      expectedConsumption: Math.round(consumption * 100) / 100,
      confidence: Math.round(confidence),
    });
  }

  return predictions;
}

/**
 * Estimate solar radiation for specific hour based on daily average
 */
function estimateHourlySolarRadiation(
  hour: number,
  dailyAvgRadiation: number,
  cloudCover: number
): number {
  // Gaussian distribution throughout the day
  const peakHour = 13;
  const sigma = 4;
  const gaussian = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(sigma, 2)));

  // Scale daily average by gaussian curve
  let radiation = dailyAvgRadiation * gaussian * 1.8; // 1.8 to reach peak values

  // Apply cloud variability
  const cloudVariability = 1 - (Math.random() * cloudCover / 200);
  radiation *= cloudVariability;

  return Math.max(0, Math.round(radiation));
}

/**
 * Estimate temperature for specific hour
 */
function estimateHourlyTemperature(hour: number, maxTemp: number, minTemp: number): number {
  // Temperature follows sinusoidal pattern
  // Min at 6 AM, Max at 3 PM
  const amplitude = (maxTemp - minTemp) / 2;
  const average = (maxTemp + minTemp) / 2;
  const phase = ((hour - 6) / 24) * 2 * Math.PI;
  const temp = average + amplitude * Math.sin(phase);

  return Math.round(temp * 10) / 10;
}

/**
 * Predict consumption based on hour of day
 */
function predictConsumption(hour: number): number {
  const baseDay = 35;   // kW during day
  const baseNight = 18; // kW at night

  // Peak hours: morning (7-9) and evening (18-22)
  if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 22)) {
    return baseDay * 1.3;
  }
  // Normal day hours
  if (hour >= 6 && hour < 18) {
    return baseDay;
  }
  // Night hours
  return baseNight;
}

/**
 * Calculate prediction confidence
 * Decreases with time and increases with uncertainty
 */
function calculatePredictionConfidence(hoursAhead: number, cloudCover: number): number {
  // Base confidence decreases with time
  let confidence = 95 - (hoursAhead * 2);

  // Cloudy conditions reduce confidence
  const cloudUncertainty = cloudCover / 5; // Max 20% reduction
  confidence -= cloudUncertainty;

  return Math.max(50, Math.min(95, confidence));
}

/**
 * Generate intelligent alerts based on predictions
 */
export function generateAlerts(
  predictions: Prediction[],
  batteryLevel: number,
  weatherForecast: DayForecast[]
): Alert[] {
  const alerts: Alert[] = [];

  // Check for low battery
  if (batteryLevel < 20) {
    alerts.push({
      id: 'battery-low',
      type: 'warning',
      title: 'Batería Baja',
      message: `Nivel de batería en ${batteryLevel.toFixed(1)}%. Se recomienda reducir consumo.`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check for very low battery
  if (batteryLevel < 10) {
    alerts.push({
      id: 'battery-critical',
      type: 'critical',
      title: 'Batería Crítica',
      message: `Nivel de batería crítico: ${batteryLevel.toFixed(1)}%. Riesgo de corte de energía.`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check for low production forecast tomorrow
  const tomorrow = weatherForecast[1];
  if (tomorrow && tomorrow.predictedProduction < 150) {
    alerts.push({
      id: 'low-production-forecast',
      type: 'warning',
      title: 'Baja Producción Esperada',
      message: `Se espera baja producción mañana (${tomorrow.predictedProduction.toFixed(0)} kWh) debido a ${tomorrow.condition === 'cloudy' ? 'nubosidad' : 'condiciones climáticas'}. Optimice consumo.`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check for excellent production forecast
  const todayForecast = weatherForecast[0];
  if (todayForecast && todayForecast.predictedProduction > 350) {
    alerts.push({
      id: 'high-production-forecast',
      type: 'info',
      title: 'Excelente Producción Esperada',
      message: `Se espera alta producción hoy (${todayForecast.predictedProduction.toFixed(0)} kWh). Buen momento para cargas intensivas.`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check next 6 hours for production deficit
  const next6Hours = predictions.slice(0, 6);
  const avgDeficit = next6Hours.reduce((sum, p) => {
    const deficit = p.expectedConsumption - p.expectedProduction;
    return sum + (deficit > 0 ? deficit : 0);
  }, 0) / 6;

  if (avgDeficit > 10 && batteryLevel < 50) {
    alerts.push({
      id: 'deficit-warning',
      type: 'warning',
      title: 'Déficit Energético Próximo',
      message: `Se espera déficit promedio de ${avgDeficit.toFixed(1)} kW en las próximas 6 horas. Considere reducir consumo no esencial.`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Generate recommendations based on current state and predictions
 */
export function generateRecommendations(
  predictions: Prediction[],
  batteryLevel: number,
  currentProduction: number,
  currentConsumption: number
): string[] {
  const recommendations: string[] = [];

  // Current surplus - recommend charging devices
  if (currentProduction > currentConsumption * 1.2) {
    recommendations.push('Excedente solar disponible. Momento ideal para cargar vehículos eléctricos o baterías.');
  }

  // Low battery with good production coming
  const next3Hours = predictions.slice(0, 3);
  const avgProduction = next3Hours.reduce((sum, p) => sum + p.expectedProduction, 0) / 3;

  if (batteryLevel < 40 && avgProduction > 30) {
    recommendations.push('La batería está baja pero se espera buena producción solar. Posponga consumos intensivos 2-3 horas.');
  }

  // Peak production hours approaching
  const currentHour = new Date().getHours();
  if (currentHour >= 9 && currentHour <= 11 && batteryLevel < 70) {
    recommendations.push('Se aproximan las horas de mayor producción solar (12-14h). Planifique actividades de alto consumo para este período.');
  }

  // Evening approaching with low battery
  if (currentHour >= 16 && currentHour <= 18 && batteryLevel < 50) {
    recommendations.push('La producción solar disminuirá pronto. Considere cargar la batería o reducir consumo vespertino.');
  }

  // Excellent conditions
  if (currentProduction > SOLAR_CAPACITY * 0.8) {
    recommendations.push(`Sistema operando a ${((currentProduction / SOLAR_CAPACITY) * 100).toFixed(0)}% de capacidad. Excelentes condiciones solares.`);
  }

  // Poor production day
  const todayPrediction = predictions[0];
  if (todayPrediction && todayPrediction.expectedProduction < SOLAR_CAPACITY * 0.3) {
    recommendations.push('Día de baja producción solar. Priorice consumos esenciales y considere usar energía de red para cargas críticas.');
  }

  return recommendations;
}
