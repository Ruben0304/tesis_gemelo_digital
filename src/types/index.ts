// Core data types for Solar Digital Twin

export interface SolarData {
  timestamp: string;
  production: number;      // kW - Current solar production
  consumption: number;     // kW - Current consumption
  batteryLevel: number;    // % - Battery charge level (0-100)
  gridExport: number;      // kW - Power exported to grid
  gridImport: number;      // kW - Power imported from grid
  efficiency: number;      // % - System efficiency
  batteryDelta?: number;   // kW - Positive = charging, Negative = discharging (optional projections)
}

export interface WeatherData {
  temperature: number;     // °C - Current temperature
  solarRadiation: number;  // W/m² - Solar irradiance
  cloudCover: number;      // % - Cloud coverage (0-100)
  humidity: number;        // % - Relative humidity
  windSpeed: number;       // km/h - Wind speed
  forecast: DayForecast[]; // 7-day forecast
}

export interface DayForecast {
  date: string;            // ISO date string
  dayOfWeek: string;       // e.g., "Lunes", "Martes"
  maxTemp: number;         // °C - Maximum temperature
  minTemp: number;         // °C - Minimum temperature
  solarRadiation: number;  // W/m² - Average solar irradiance
  cloudCover: number;      // % - Average cloud coverage
  predictedProduction: number; // kWh - Predicted daily production
  condition: WeatherCondition;
}

export type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy';

export interface BatteryStatus {
  chargeLevel: number;     // % - Current charge (0-100)
  capacity: number;        // kWh - Total battery capacity
  current: number;         // kWh - Current stored energy
  autonomyHours: number;   // Hours - Estimated autonomy time
  charging: boolean;       // Is battery currently charging
  powerFlow: number;       // kW - Positive = charging, Negative = discharging
  projectedMinLevel?: number; // % - Minimum projected level (optional)
  projectedMaxLevel?: number; // % - Maximum projected level (optional)
  note?: string;            // Additional context (optional)
}

export interface SystemMetrics {
  currentProduction: number;  // kW
  currentConsumption: number; // kW
  energyBalance: number;      // kW (production - consumption)
  systemEfficiency: number;   // %
  dailyProduction: number;    // kWh - Total produced today
  dailyConsumption: number;   // kWh - Total consumed today
  co2Avoided: number;         // kg - CO2 emissions avoided today
}

export interface EnergyFlow {
  solarToBattery: number;    // kW
  solarToLoad: number;       // kW
  solarToGrid: number;       // kW
  batteryToLoad: number;     // kW
  gridToLoad: number;        // kW
}

export interface Prediction {
  timestamp: string;
  hour: number;
  expectedProduction: number; // kWh
  expectedConsumption: number; // kWh
  confidence: number;        // % - Prediction confidence
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  timestamp: string;
}

// Configuration for the microgrid system
export interface SystemConfig {
  solarCapacity: number;     // kW - Total installed solar capacity
  batteryCapacity: number;   // kWh - Total battery storage
  location: {
    lat: number;
    lon: number;
    name: string;
  };
}
