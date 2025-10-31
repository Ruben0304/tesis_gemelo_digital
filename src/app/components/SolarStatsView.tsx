'use client';

import { useMemo, useState } from 'react';
import { SolarData, WeatherData, SystemConfig } from '@/types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Bar,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SunIcon, SparklesIcon, BoltIcon, Battery50Icon } from '@heroicons/react/24/outline';

type RangeKey = 'day' | 'month' | 'year' | 'total';

interface SolarStatsViewProps {
  timeline: SolarData[];
  weather?: WeatherData | null;
  config: SystemConfig;
}

interface AggregatedStats {
  production: number;
  consumption: number;
  export: number;
  batteryCharge: number;
  batteryDischarge: number;
  directUse: number;
  selfConsumption: number;
  coverage: number;
  selfConsumptionRatio: number;
  coverageRatio: number;
}

const RANGE_TABS: Array<{ id: RangeKey; label: string; subtitle: string }> = [
  { id: 'day', label: 'Día', subtitle: 'Últimas 24 h' },
  { id: 'month', label: 'Mes', subtitle: 'Proyección 30 días' },
  { id: 'year', label: 'Año', subtitle: 'Escalado 12 meses' },
  { id: 'total', label: 'Total', subtitle: 'Ciclo operativo' },
];

const COLORS = {
  direct: '#22c55e',
  battery: '#f97316',
  export: '#0ea5e9',
  self: '#22c55e',
  excess: '#f97316',
};

const LIFETIME_YEARS = 5;

const formatterEnergy = (value: number): { value: number; unit: 'kWh' | 'MWh' } => {
  if (Math.abs(value) >= 1000) {
    return { value: Number((value / 1000).toFixed(2)), unit: 'MWh' };
  }
  return { value: Number(value.toFixed(2)), unit: 'kWh' };
};

const round = (value: number) => Number(value.toFixed(2));

function aggregateTimeline(timeline: SolarData[]): AggregatedStats {
  if (timeline.length === 0) {
    return {
      production: 0,
      consumption: 0,
      export: 0,
      batteryCharge: 0,
      batteryDischarge: 0,
      directUse: 0,
      selfConsumption: 0,
      coverage: 0,
      selfConsumptionRatio: 0,
      coverageRatio: 0,
    };
  }

  const aggregates = timeline.reduce(
    (acc, entry) => {
      const production = entry.production ?? 0;
      const consumption = entry.consumption ?? 0;
      const exportEnergy = entry.gridExport ?? Math.max(0, production - consumption);
      const batteryDelta = entry.batteryDelta ?? 0;
      const batteryCharge = batteryDelta > 0 ? batteryDelta : 0;
      const batteryDischarge = batteryDelta < 0 ? Math.abs(batteryDelta) : 0;
      const directUse = Math.max(0, production - exportEnergy - batteryCharge);

      acc.production += production;
      acc.consumption += consumption;
      acc.export += exportEnergy;
      acc.batteryCharge += batteryCharge;
      acc.batteryDischarge += batteryDischarge;
      acc.directUse += directUse;
      return acc;
    },
    {
      production: 0,
      consumption: 0,
      export: 0,
      batteryCharge: 0,
      batteryDischarge: 0,
      directUse: 0,
    }
  );

  const selfConsumption = Math.max(0, aggregates.production - aggregates.export);
  const coverage = Math.min(
    aggregates.consumption,
    aggregates.directUse + aggregates.batteryDischarge
  );

  const selfConsumptionRatio =
    aggregates.production > 0 ? selfConsumption / aggregates.production : 0;
  const coverageRatio = aggregates.consumption > 0 ? coverage / aggregates.consumption : 0;

  return {
    production: round(aggregates.production),
    consumption: round(aggregates.consumption),
    export: round(aggregates.export),
    batteryCharge: round(aggregates.batteryCharge),
    batteryDischarge: round(aggregates.batteryDischarge),
    directUse: round(aggregates.directUse),
    selfConsumption: round(selfConsumption),
    coverage: round(coverage),
    selfConsumptionRatio: round(selfConsumptionRatio),
    coverageRatio: round(coverageRatio),
  };
}

function scaleStats(stats: AggregatedStats, factor: number): AggregatedStats {
  return {
    production: round(stats.production * factor),
    consumption: round(stats.consumption * factor),
    export: round(stats.export * factor),
    batteryCharge: round(stats.batteryCharge * factor),
    batteryDischarge: round(stats.batteryDischarge * factor),
    directUse: round(stats.directUse * factor),
    selfConsumption: round(stats.selfConsumption * factor),
    coverage: round(stats.coverage * factor),
    selfConsumptionRatio: stats.selfConsumptionRatio,
    coverageRatio: stats.coverageRatio,
  };
}

export default function SolarStatsView({ timeline, weather, config }: SolarStatsViewProps) {
  const [activeRange, setActiveRange] = useState<RangeKey>('day');

  const todayStats = useMemo(() => aggregateTimeline(timeline), [timeline]);

  const forecastAverage =
    weather?.forecast && weather.forecast.length > 0
      ? weather.forecast.reduce((sum, item) => sum + Math.max(item.predictedProduction, 0), 0) /
        weather.forecast.length
      : null;

  const dailyBaseline = todayStats.production || forecastAverage || config.solar.capacityKw * 4;
  const adjustmentFactor =
    todayStats.production > 0 && forecastAverage
      ? forecastAverage / todayStats.production
      : 1;

  const statsByRange: Record<RangeKey, AggregatedStats> = useMemo(() => {
    const monthFactor = 30 * adjustmentFactor;
    const yearFactor = 365 * adjustmentFactor;
    const lifetimeFactor = yearFactor * LIFETIME_YEARS;

    return {
      day: todayStats,
      month: scaleStats(todayStats, monthFactor),
      year: scaleStats(todayStats, yearFactor),
      total: scaleStats(todayStats, lifetimeFactor),
    };
  }, [todayStats, adjustmentFactor]);

  const selectedStats = statsByRange[activeRange];

  const chartData = useMemo(() => {
    if (activeRange === 'day') {
      return timeline.map((entry) => {
        const timestamp = new Date(entry.timestamp);
        const label = format(timestamp, 'HH:mm', { locale: es });
        const exportEnergy = entry.gridExport ?? Math.max(0, entry.production - entry.consumption);
        const selfConsumption = Math.max(0, entry.production - exportEnergy);

        return {
          label,
          Autoconsumo: Number(selfConsumption.toFixed(2)),
          Excedentes: Number(exportEnergy.toFixed(2)),
        };
      });
    }

    if (activeRange === 'month' && weather?.forecast?.length) {
      return weather.forecast.map((day) => {
        const production = Math.max(day.predictedProduction, 0);
        const autoValue = production * selectedStats.selfConsumptionRatio;
        const exportValue = production - autoValue;
        return {
          label: format(new Date(day.date), 'EEE', { locale: es }),
          Autoconsumo: Number(autoValue.toFixed(2)),
          Excedentes: Number(Math.max(exportValue, 0).toFixed(2)),
        };
      });
    }

    if (activeRange === 'year') {
      const months = Array.from({ length: 12 }, (_, idx) => {
        const monthDate = new Date(new Date().getFullYear(), idx, 1);
        const seasonal =
          0.9 + 0.25 * Math.sin((2 * Math.PI * idx) / 12 - Math.PI / 2);
        const production = dailyBaseline * 30 * seasonal;
        const autoValue = production * selectedStats.selfConsumptionRatio;
        const exportValue = production - autoValue;
        return {
          label: format(monthDate, 'MMM', { locale: es }),
          Autoconsumo: Number(Math.max(autoValue, 0).toFixed(2)),
          Excedentes: Number(Math.max(exportValue, 0).toFixed(2)),
        };
      });
      return months;
    }

    if (activeRange === 'total') {
      const currentYear = new Date().getFullYear();
      return Array.from({ length: LIFETIME_YEARS }, (_, idx) => {
        const year = currentYear - (LIFETIME_YEARS - 1 - idx);
        const production = statsByRange.year.production;
        const autoValue = production * selectedStats.selfConsumptionRatio;
        const exportValue = production - autoValue;
        return {
          label: year.toString(),
          Autoconsumo: Number(Math.max(autoValue, 0).toFixed(2)),
          Excedentes: Number(Math.max(exportValue, 0).toFixed(2)),
        };
      });
    }

    return [];
  }, [
    activeRange,
    timeline,
    weather?.forecast,
    selectedStats.selfConsumptionRatio,
    statsByRange.year.production,
    dailyBaseline,
  ]);

  const productionDistribution = [
    {
      name: 'Consumo directo',
      value: Math.max(selectedStats.directUse, 0),
      color: COLORS.direct,
    },
    {
      name: 'Almacenado en batería',
      value: Math.max(selectedStats.batteryCharge, 0),
      color: COLORS.battery,
    },
    {
      name: 'Excedentes',
      value: Math.max(selectedStats.export, 0),
      color: COLORS.export,
    },
  ].filter((item) => item.value > 0);

  const consumptionDistribution = [
    {
      name: 'Autoconsumo directo',
      value: Math.max(selectedStats.directUse, 0),
      color: COLORS.direct,
    },
    {
      name: 'Apoyo de baterías',
      value: Math.max(selectedStats.batteryDischarge, 0),
      color: COLORS.battery,
    },
  ].filter((item) => item.value > 0);

  const autoproduction = formatterEnergy(selectedStats.production);
  const autoself = formatterEnergy(selectedStats.selfConsumption);
  const directSolar = formatterEnergy(selectedStats.directUse);
  const batterySupport = formatterEnergy(selectedStats.batteryDischarge);
  const exportedEnergy = formatterEnergy(selectedStats.export);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-sky-100/60 backdrop-blur-xl">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em]">
                Gestión fotovoltaica
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                {config.location.name}
              </h2>
            </div>
                  <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <SunIcon className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Producción {activeRange === 'day' ? 'hoy' : 'estimada'}
                  </span>
                </div>
                <p className="mt-2 text-xl font-bold text-emerald-700">
                  {autoproduction.value} {autoproduction.unit}
                </p>
              </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                    <div className="flex items-center gap-2 text-sky-600">
                      <SparklesIcon className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Autoconsumo
                  </span>
                </div>
                <p className="mt-2 text-xl font-bold text-sky-700">
                  {autoself.value} {autoself.unit}
                </p>
                <p className="text-xs text-sky-600">
                  {(selectedStats.selfConsumptionRatio * 100).toFixed(1)}% de la producción
                </p>
              </div>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-2">
            {RANGE_TABS.map((tab) => {
              const isActive = tab.id === activeRange;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRange(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-300/40'
                      : 'bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <div className="flex flex-col leading-tight">
                    <span>{tab.label}</span>
                    <span className="text-[10px] font-normal uppercase tracking-[0.2em]">
                      {tab.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Flujo de producción
                  </h3>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Sólo fotovoltaica
                  </span>
                </div>
                <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
                  <div className="w-full lg:w-1/2">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={productionDistribution}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="60%"
                          outerRadius="90%"
                          paddingAngle={3}
                        >
                          {productionDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => {
                            const formatted = formatterEnergy(value);
                            return [`${formatted.value} ${formatted.unit}`, ''];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {productionDistribution.map((item) => {
                      const share =
                        selectedStats.production > 0
                          ? ((item.value / selectedStats.production) * 100).toFixed(1)
                          : '0.0';
                      const formatted = formatterEnergy(item.value);
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/60 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <p className="text-sm font-medium text-slate-700">{item.name}</p>
                          </div>
                          <div className="text-right text-sm text-slate-600">
                            <p className="font-semibold text-slate-900">
                              {formatted.value} {formatted.unit}
                            </p>
                            <p>{share}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/70 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Cobertura de demanda
                  </h3>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Autonomía FV
                  </span>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[220px,1fr]">
                  <div className="mx-auto w-full max-w-xs">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={consumptionDistribution}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={4}
                        >
                          {consumptionDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => {
                            const formatted = formatterEnergy(value);
                            return [`${formatted.value} ${formatted.unit}`, ''];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Demanda cubierta con energía solar y almacenamiento.
                      </p>
                      <p className="mt-4 text-3xl font-bold text-slate-900">
                        {(selectedStats.coverageRatio * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        del consumo total
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 p-4">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <BoltIcon className="h-5 w-5" />
                          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                            Directo desde FV
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {directSolar.value} {directSolar.unit}
                        </p>
                      </div>
                      <div className="rounded-xl border border-orange-200/70 bg-orange-50/70 p-4">
                        <div className="flex items-center gap-2 text-orange-600">
                          <Battery50Icon className="h-5 w-5" />
                          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                            Desde baterías
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {batterySupport.value} {batterySupport.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-inner shadow-slate-900/30">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Indicadores clave
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    Rendimiento solar {activeRange === 'day' ? 'diario' : 'estimado'}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/70">
                      Ratio de autoconsumo
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {(selectedStats.selfConsumptionRatio * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-white/70">de la energía generada</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/70">
                      Cobertura de demanda
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {(selectedStats.coverageRatio * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-white/70">
                      consumo alimentado sólo por fotovoltaica
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/70">
                      Excedentes inyectados
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {exportedEnergy.value} {exportedEnergy.unit}
                    </p>
                    <p className="text-sm text-white/70">disponibles para monetización o respaldo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/70 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Evolución de la producción solar
                </h3>
                <p className="text-sm text-slate-500">
                  Comparativa entre autoconsumo y excedentes en el periodo seleccionado
                </p>
              </div>
            </div>
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => {
                      const formatted = formatterEnergy(value);
                      return [`${formatted.value} ${formatted.unit}`, ''];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Autoconsumo" stackId="pv" fill={COLORS.self} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Excedentes" stackId="pv" fill={COLORS.excess} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
