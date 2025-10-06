import { WeatherData, WeatherCondition } from '@/types';
import { Cloud, CloudRain, Sun, CloudSun, Droplets, Wind, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeatherWidgetProps {
  weather: WeatherData;
}

export default function WeatherWidget({ weather }: WeatherWidgetProps) {
  const { temperature, solarRadiation, cloudCover, humidity, windSpeed, forecast } = weather;

  // Get weather icon based on condition
  const getWeatherIcon = (condition: WeatherCondition, size: number = 24) => {
    const className = `w-${size} h-${size}`;
    switch (condition) {
      case 'sunny':
        return <Sun className={className + ' text-yellow-400'} />;
      case 'partly-cloudy':
        return <CloudSun className={className + ' text-yellow-300'} />;
      case 'cloudy':
        return <Cloud className={className + ' text-gray-400'} />;
      case 'rainy':
        return <CloudRain className={className + ' text-blue-400'} />;
      default:
        return <Sun className={className + ' text-yellow-400'} />;
    }
  };

  const getCurrentCondition = (): WeatherCondition => {
    if (cloudCover < 20) return 'sunny';
    if (cloudCover < 50) return 'partly-cloudy';
    if (cloudCover < 80) return 'cloudy';
    return 'rainy';
  };

  const currentCondition = getCurrentCondition();

  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">
          Condiciones Climáticas
        </h2>
        <p className="text-sm text-gray-400">
          Tiempo real y pronóstico
        </p>
      </div>

      {/* Current weather */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
        <div className="flex items-center gap-4">
          {getWeatherIcon(currentCondition, 16)}
          <div>
            <div className="text-5xl font-extrabold text-white">
              {temperature.toFixed(1)}°
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {currentCondition === 'sunny' && 'Soleado'}
              {currentCondition === 'partly-cloudy' && 'Parcialmente Nublado'}
              {currentCondition === 'cloudy' && 'Nublado'}
              {currentCondition === 'rainy' && 'Lluvioso'}
            </div>
          </div>
        </div>
      </div>

      {/* Weather metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">Radiación Solar</span>
          </div>
          <div className="text-lg font-bold text-white">
            {solarRadiation} W/m²
          </div>
        </div>

        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Cloud className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Nubosidad</span>
          </div>
          <div className="text-lg font-bold text-white">
            {cloudCover}%
          </div>
        </div>

        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Humedad</span>
          </div>
          <div className="text-lg font-bold text-white">
            {humidity}%
          </div>
        </div>

        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Viento</span>
          </div>
          <div className="text-lg font-bold text-white">
            {windSpeed} km/h
          </div>
        </div>
      </div>

      {/* 5-day forecast */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          Pronóstico 5 Días
        </h3>
        <div className="space-y-2">
          {forecast.slice(0, 5).map((day, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {getWeatherIcon(day.condition, 6)}
                <span className="text-sm font-medium text-gray-300 w-24">
                  {index === 0
                    ? 'Hoy'
                    : format(new Date(day.date), 'EEE', { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-400">Temp</div>
                  <div className="text-sm font-semibold text-white">
                    {day.maxTemp.toFixed(0)}° / {day.minTemp.toFixed(0)}°
                  </div>
                </div>
                <div className="text-right w-20">
                  <div className="text-xs text-gray-400">Prod.</div>
                  <div className="text-sm font-semibold text-green-400">
                    {day.predictedProduction.toFixed(0)} kWh
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
