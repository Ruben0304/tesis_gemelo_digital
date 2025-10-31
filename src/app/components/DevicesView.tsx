'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BatteryCharging, CheckCircle2, Info, Layers, MoreVertical } from 'lucide-react';
import type { BatteryConfig, SolarPanelConfig, SystemConfig } from '@/types';

type DeviceTab = 'all' | 'panels' | 'batteries';

interface DevicesViewProps {
  panels: SolarPanelConfig[];
  batteries: BatteryConfig[];
  systemConfig: SystemConfig;
}

interface DeviceCard {
  id: string;
  type: DeviceTab;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'neutral';
  specs: Array<{ label: string; value: string }>;
  footerLabel: string;
  footerHref: string;
  icon: 'panel' | 'battery';
  updatedAt?: string;
}

const statusToneClasses: Record<DeviceCard['statusTone'], string> = {
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-slate-600',
};

export default function DevicesView({ panels, batteries, systemConfig }: DevicesViewProps) {
  const [activeTab, setActiveTab] = useState<DeviceTab>('all');

  const cards = useMemo<DeviceCard[]>(() => {
    const panelCards: DeviceCard[] = panels.map((panel) => ({
      id: panel._id ?? panel.name ?? `panel-${Math.random().toString(36).slice(2, 8)}`,
      type: 'panels',
      title: panel.name || 'Panel sin nombre',
      subtitle: `${panel.manufacturer ?? 'Fabricante desconocido'}${panel.model ? ` • ${panel.model}` : ''}`,
      statusLabel: 'Operativo',
      statusTone: 'success',
      specs: [
        {
          label: 'Potencia por panel',
          value:
            panel.ratedPowerKw !== undefined
              ? `${panel.ratedPowerKw.toFixed(2)} kW`
              : 'Sin dato',
        },
        {
          label: 'Strings activos',
          value: panel.strings !== undefined ? `${panel.strings}` : 'Sin dato',
        },
        {
          label: 'Cantidad instalada',
          value: panel.quantity !== undefined ? `${panel.quantity} unidades` : 'Sin dato',
        },
        panel.efficiencyPercent
          ? { label: 'Eficiencia nominal', value: `${panel.efficiencyPercent.toFixed(1)} %` }
          : null,
        panel.orientation ? { label: 'Orientación', value: panel.orientation } : null,
        panel.tiltDegrees !== undefined
          ? { label: 'Inclinación', value: `${panel.tiltDegrees.toFixed(1)}°` }
          : null,
      ].filter(Boolean) as DeviceCard['specs'],
      footerLabel: 'Gestionar paneles',
      footerHref: '/configuracion',
      icon: 'panel',
      updatedAt: panel.updatedAt ?? panel.createdAt,
    }));

    const batteryCards: DeviceCard[] = batteries.map((battery) => ({
      id: battery._id ?? battery.name ?? `battery-${Math.random().toString(36).slice(2, 8)}`,
      type: 'batteries',
      title: battery.name || 'Batería sin nombre',
      subtitle: `${battery.manufacturer ?? 'Proveedor desconocido'}${battery.model ? ` • ${battery.model}` : ''}`,
      statusLabel: 'Disponible',
      statusTone: 'success',
      specs: [
        {
          label: 'Capacidad total',
          value:
            battery.capacityKwh !== undefined
              ? `${battery.capacityKwh.toFixed(1)} kWh`
              : 'Sin dato',
        },
        {
          label: 'Módulos instalados',
          value: battery.quantity !== undefined ? `${battery.quantity}` : 'Sin dato',
        },
        battery.maxDepthOfDischargePercent
          ? { label: 'Profundidad descarg.', value: `${battery.maxDepthOfDischargePercent.toFixed(0)} %` }
          : null,
        battery.chargeRateKw
          ? { label: 'Velocidad carga', value: `${battery.chargeRateKw.toFixed(1)} kW` }
          : null,
        battery.dischargeRateKw
          ? { label: 'Velocidad descarga', value: `${battery.dischargeRateKw.toFixed(1)} kW` }
          : null,
        battery.chemistry ? { label: 'Química', value: battery.chemistry } : null,
      ].filter(Boolean) as DeviceCard['specs'],
      footerLabel: 'Gestionar baterías',
      footerHref: '/configuracion',
      icon: 'battery',
      updatedAt: battery.updatedAt ?? battery.createdAt,
    }));

    if (panelCards.length === 0 && batteryCards.length === 0) {
      return [];
    }

    return [...panelCards, ...batteryCards];
  }, [panels, batteries]);

  const activeCards = useMemo(() => {
    switch (activeTab) {
      case 'panels':
        return cards.filter((card) => card.type === 'panels');
      case 'batteries':
        return cards.filter((card) => card.type === 'batteries');
      default:
        return cards;
    }
  }, [activeTab, cards]);

  const tabs: Array<{ id: DeviceTab; label: string }> = [
    { id: 'all', label: 'Todo' },
    { id: 'panels', label: `Paneles (${panels.length})` },
    { id: 'batteries', label: `Batería (${batteries.length})` },
  ];

  const systemSummary = useMemo(() => {
    const { solar, battery } = systemConfig;
    return [
      {
        label: 'Capacidad solar instalada',
        value:
          typeof solar.capacityKw === 'number'
            ? `${solar.capacityKw.toFixed(1)} kW`
            : 'Sin dato',
      },
      {
        label: 'Capacidad de almacenamiento',
        value:
          typeof battery.capacityKwh === 'number'
            ? `${battery.capacityKwh.toFixed(1)} kWh`
            : 'Sin dato',
      },
      {
        label: 'Paneles activos',
        value: panels.length > 0 ? `${panels.length} configuraciones` : 'Sin registros',
      },
      {
        label: 'Baterías activas',
        value: batteries.length > 0 ? `${batteries.length} configuraciones` : 'Sin registros',
      },
    ];
  }, [systemConfig, panels.length, batteries.length]);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-6 border-b border-slate-200 px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-1 pb-3 text-sm font-semibold transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[1px] h-[3px] rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/50 bg-white/60 p-6 backdrop-blur-xl shadow-[0_30px_70px_-50px_rgba(15,23,42,0.65)]">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5">
          <Info className="h-5 w-5 text-blue-500" />
          <div className="grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4 w-full">
            {systemSummary.map((entry) => (
              <div key={entry.label}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{entry.label}</p>
                <p className="text-sm font-semibold text-slate-700">{entry.value}</p>
              </div>
            ))}
          </div>
        </div>

        {activeCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 py-14 text-center">
            <Layers className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-600">Sin dispositivos configurados</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Añada paneles o baterías desde la sección de configuración para monitorear el estado de cada activo.
            </p>
            <Link
              href="/configuracion"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Abrir configuración
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {activeCards.map((card) => (
              <article
                key={card.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]"
              >
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                    <p className="text-sm text-slate-500">{card.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusToneClasses[card.statusTone]}`}
                    >
                      {card.statusLabel}
                    </span>
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Acciones"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  {card.specs.map((spec) => (
                    <div key={`${card.id}-${spec.label}`} className="rounded-2xl bg-slate-50/70 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-slate-400">{spec.label}</dt>
                      <dd className="text-sm font-semibold text-slate-700">{spec.value}</dd>
                    </div>
                  ))}
                </dl>

                <footer className="flex items-center justify-between pt-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  {card.icon === 'panel' ? (
                    <Layers className="h-4 w-4 text-blue-500" />
                  ) : (
                    <BatteryCharging className="h-4 w-4 text-emerald-500" />
                  )}
                  Última actualización:{' '}
                  <strong className="font-semibold text-slate-700">
                    {card.updatedAt
                      ? new Intl.DateTimeFormat('es-ES', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(card.updatedAt))
                      : 'Sin registro'}
                  </strong>
                </span>
                  <Link
                    href={card.footerHref}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {card.footerLabel}
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
