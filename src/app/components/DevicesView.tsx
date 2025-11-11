'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  BatteryCharging,
  Eye,
  Info,
  Layers,
  Pencil,
  Plus,
  Trash,
  X,
} from 'lucide-react';
import type { BatteryConfig, SolarPanelConfig, SystemConfig } from '@/types';
import { executeMutation } from '@/lib/graphql-client';

interface DevicesViewProps {
  panels: SolarPanelConfig[];
  batteries: BatteryConfig[];
  systemConfig: SystemConfig;
  onRefresh?: () => Promise<void> | void;
}

type StatusMessage = { type: 'success' | 'error'; text: string } | null;

interface PanelFormState {
  _id?: string;
  name: string;
  manufacturer: string;
  model: string;
  ratedPowerKw: string;
  quantity: string;
  strings: string;
  efficiencyPercent: string;
  areaM2: string;
  tiltDegrees: string;
  orientation: string;
  notes: string;
}

interface BatteryFormState {
  _id?: string;
  name: string;
  manufacturer: string;
  model: string;
  capacityKwh: string;
  quantity: string;
  maxDepthOfDischargePercent: string;
  chargeRateKw: string;
  dischargeRateKw: string;
  efficiencyPercent: string;
  chemistry: string;
  nominalVoltage: string;
  notes: string;
}

type DetailModalState =
  | { type: 'panel'; data: SolarPanelConfig }
  | { type: 'battery'; data: BatteryConfig }
  | null;

const emptyPanelForm: PanelFormState = {
  name: '',
  manufacturer: '',
  model: '',
  ratedPowerKw: '',
  quantity: '',
  strings: '',
  efficiencyPercent: '',
  areaM2: '',
  tiltDegrees: '',
  orientation: '',
  notes: '',
};

const emptyBatteryForm: BatteryFormState = {
  name: '',
  manufacturer: '',
  model: '',
  capacityKwh: '',
  quantity: '',
  maxDepthOfDischargePercent: '',
  chargeRateKw: '',
  dischargeRateKw: '',
  efficiencyPercent: '',
  chemistry: '',
  nominalVoltage: '',
  notes: '',
};

const statusToneClasses = {
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-slate-600',
} as const;

const CREATE_PANEL_MUTATION = `
  mutation CreatePanel($input: PanelInput!) {
    createPanel(input: $input) { _id }
  }
`;

const UPDATE_PANEL_MUTATION = `
  mutation UpdatePanel($id: String!, $input: PanelInput!) {
    updatePanel(id: $id, input: $input) { _id }
  }
`;

const DELETE_PANEL_MUTATION = `
  mutation DeletePanel($id: String!) {
    deletePanel(id: $id)
  }
`;

const CREATE_BATTERY_MUTATION = `
  mutation CreateBattery($input: BatteryInput!) {
    createBattery(input: $input) { _id }
  }
`;

const UPDATE_BATTERY_MUTATION = `
  mutation UpdateBattery($id: String!, $input: BatteryInput!) {
    updateBattery(id: $id, input: $input) { _id }
  }
`;

const DELETE_BATTERY_MUTATION = `
  mutation DeleteBattery($id: String!) {
    deleteBattery(id: $id)
  }
`;

const parseNumber = (value: string): number | undefined => {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const cleanPayload = <T extends Record<string, unknown>>(values: T) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as T;

const formatDateTime = (iso?: string) => {
  if (!iso) return 'Sin registro';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return 'Sin registro';
    }
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return 'Sin registro';
  }
};

const toPanelFormState = (panel: SolarPanelConfig): PanelFormState => ({
  _id: panel._id,
  name: panel.name ?? '',
  manufacturer: panel.manufacturer ?? '',
  model: panel.model ?? '',
  ratedPowerKw: panel.ratedPowerKw !== undefined ? panel.ratedPowerKw.toString() : '',
  quantity: panel.quantity !== undefined ? panel.quantity.toString() : '',
  strings: panel.strings !== undefined ? panel.strings.toString() : '',
  efficiencyPercent:
    panel.efficiencyPercent !== undefined ? panel.efficiencyPercent.toString() : '',
  areaM2: panel.areaM2 !== undefined ? panel.areaM2.toString() : '',
  tiltDegrees: panel.tiltDegrees !== undefined ? panel.tiltDegrees.toString() : '',
  orientation: panel.orientation ?? '',
  notes: panel.notes ?? '',
});

const toBatteryFormState = (battery: BatteryConfig): BatteryFormState => ({
  _id: battery._id,
  name: battery.name ?? '',
  manufacturer: battery.manufacturer ?? '',
  model: battery.model ?? '',
  capacityKwh: battery.capacityKwh !== undefined ? battery.capacityKwh.toString() : '',
  quantity: battery.quantity !== undefined ? battery.quantity.toString() : '',
  maxDepthOfDischargePercent:
    battery.maxDepthOfDischargePercent !== undefined
      ? battery.maxDepthOfDischargePercent.toString()
      : '',
  chargeRateKw: battery.chargeRateKw !== undefined ? battery.chargeRateKw.toString() : '',
  dischargeRateKw:
    battery.dischargeRateKw !== undefined ? battery.dischargeRateKw.toString() : '',
  efficiencyPercent:
    battery.efficiencyPercent !== undefined ? battery.efficiencyPercent.toString() : '',
  chemistry: battery.chemistry ?? '',
  nominalVoltage:
    battery.nominalVoltage !== undefined ? battery.nominalVoltage.toString() : '',
  notes: battery.notes ?? '',
});

export default function DevicesView({
  panels,
  batteries,
  systemConfig,
  onRefresh,
}: DevicesViewProps) {
  const [panelMessage, setPanelMessage] = useState<StatusMessage>(null);
  const [panelModalMessage, setPanelModalMessage] = useState<StatusMessage>(null);
  const [panelModalOpen, setPanelModalOpen] = useState(false);
  const [panelModalMode, setPanelModalMode] = useState<'create' | 'edit'>('create');
  const [panelForm, setPanelForm] = useState<PanelFormState>(emptyPanelForm);
  const [panelLoading, setPanelLoading] = useState(false);

  const [batteryMessage, setBatteryMessage] = useState<StatusMessage>(null);
  const [batteryModalMessage, setBatteryModalMessage] = useState<StatusMessage>(null);
  const [batteryModalOpen, setBatteryModalOpen] = useState(false);
  const [batteryModalMode, setBatteryModalMode] = useState<'create' | 'edit'>('create');
  const [batteryForm, setBatteryForm] = useState<BatteryFormState>(emptyBatteryForm);
  const [batteryLoading, setBatteryLoading] = useState(false);

  const [detailModal, setDetailModal] = useState<DetailModalState>(null);

  useEffect(() => {
    if (!panelMessage) return;
    const timeout = window.setTimeout(() => setPanelMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [panelMessage]);

  useEffect(() => {
    if (!batteryMessage) return;
    const timeout = window.setTimeout(() => setBatteryMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [batteryMessage]);

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
        label: 'Configuraciones de paneles',
        value: panels.length > 0 ? `${panels.length} registradas` : 'Sin registros',
      },
      {
        label: 'Bancos de baterías',
        value: batteries.length > 0 ? `${batteries.length} registrados` : 'Sin registros',
      },
    ];
  }, [systemConfig, panels, batteries]);

  const buildPanelSpecs = (panel: SolarPanelConfig) =>
    [
      {
        label: 'Potencia por panel',
        value:
          panel.ratedPowerKw !== undefined ? `${panel.ratedPowerKw.toFixed(2)} kW` : 'Sin dato',
      },
      {
        label: 'Paneles instalados',
        value: panel.quantity !== undefined ? `${panel.quantity}` : 'Sin dato',
      },
      {
        label: 'Strings activos',
        value: panel.strings !== undefined ? `${panel.strings}` : 'Sin dato',
      },
      panel.efficiencyPercent !== undefined
        ? { label: 'Eficiencia nominal', value: `${panel.efficiencyPercent.toFixed(1)} %` }
        : null,
      panel.orientation
        ? {
            label: 'Orientación',
            value: panel.orientation,
          }
        : null,
      panel.tiltDegrees !== undefined
        ? { label: 'Inclinación', value: `${panel.tiltDegrees.toFixed(1)}°` }
        : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

  const buildBatterySpecs = (battery: BatteryConfig) =>
    [
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
      battery.maxDepthOfDischargePercent !== undefined
        ? {
            label: 'Profundidad de descarga',
            value: `${battery.maxDepthOfDischargePercent.toFixed(0)} %`,
          }
        : null,
      battery.chargeRateKw !== undefined
        ? { label: 'Velocidad de carga', value: `${battery.chargeRateKw.toFixed(1)} kW` }
        : null,
      battery.dischargeRateKw !== undefined
        ? { label: 'Velocidad de descarga', value: `${battery.dischargeRateKw.toFixed(1)} kW` }
        : null,
      battery.chemistry ? { label: 'Química', value: battery.chemistry } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

  const openPanelModal = (mode: 'create' | 'edit', panel?: SolarPanelConfig) => {
    setPanelModalMode(mode);
    setPanelModalMessage(null);
    setPanelForm(panel ? toPanelFormState(panel) : emptyPanelForm);
    setPanelModalOpen(true);
  };

  const openBatteryModal = (mode: 'create' | 'edit', battery?: BatteryConfig) => {
    setBatteryModalMode(mode);
    setBatteryModalMessage(null);
    setBatteryForm(battery ? toBatteryFormState(battery) : emptyBatteryForm);
    setBatteryModalOpen(true);
  };

  const handlePanelInput =
    (field: keyof PanelFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setPanelForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleBatteryInput =
    (field: keyof BatteryFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setBatteryForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handlePanelSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (panelLoading) return;
    setPanelModalMessage(null);
    setPanelLoading(true);

    const payload = cleanPayload({
      name: panelForm.name.trim(),
      manufacturer: panelForm.manufacturer.trim() || undefined,
      model: panelForm.model.trim() || undefined,
      ratedPowerKw: parseNumber(panelForm.ratedPowerKw),
      quantity: parseNumber(panelForm.quantity),
      strings: parseNumber(panelForm.strings),
      efficiencyPercent: parseNumber(panelForm.efficiencyPercent),
      areaM2: parseNumber(panelForm.areaM2),
      tiltDegrees: parseNumber(panelForm.tiltDegrees),
      orientation: panelForm.orientation.trim() || undefined,
      notes: panelForm.notes.trim() || undefined,
    });

    try {
      if (panelForm._id) {
        await executeMutation(UPDATE_PANEL_MUTATION, { id: panelForm._id, input: payload });
      } else {
        await executeMutation(CREATE_PANEL_MUTATION, { input: payload });
      }
      setPanelMessage({
        type: 'success',
        text: panelForm._id
          ? 'Panel actualizado correctamente.'
          : 'Panel creado correctamente.',
      });
      setPanelModalOpen(false);
      setPanelForm(emptyPanelForm);
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setPanelModalMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado al guardar el panel.',
      });
    } finally {
      setPanelLoading(false);
    }
  };

  const handleBatterySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (batteryLoading) return;
    setBatteryModalMessage(null);
    setBatteryLoading(true);

    const payload = cleanPayload({
      name: batteryForm.name.trim(),
      manufacturer: batteryForm.manufacturer.trim() || undefined,
      model: batteryForm.model.trim() || undefined,
      capacityKwh: parseNumber(batteryForm.capacityKwh),
      quantity: parseNumber(batteryForm.quantity),
      maxDepthOfDischargePercent: parseNumber(batteryForm.maxDepthOfDischargePercent),
      chargeRateKw: parseNumber(batteryForm.chargeRateKw),
      dischargeRateKw: parseNumber(batteryForm.dischargeRateKw),
      efficiencyPercent: parseNumber(batteryForm.efficiencyPercent),
      chemistry: batteryForm.chemistry.trim() || undefined,
      nominalVoltage: parseNumber(batteryForm.nominalVoltage),
      notes: batteryForm.notes.trim() || undefined,
    });

    try {
      if (batteryForm._id) {
        await executeMutation(UPDATE_BATTERY_MUTATION, { id: batteryForm._id, input: payload });
      } else {
        await executeMutation(CREATE_BATTERY_MUTATION, { input: payload });
      }
      setBatteryMessage({
        type: 'success',
        text: batteryForm._id
          ? 'Batería actualizada correctamente.'
          : 'Batería creada correctamente.',
      });
      setBatteryModalOpen(false);
      setBatteryForm(emptyBatteryForm);
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setBatteryModalMessage({
        type: 'error',
        text:
          error instanceof Error ? error.message : 'Error inesperado al guardar la batería.',
      });
    } finally {
      setBatteryLoading(false);
    }
  };

  const deletePanel = async (panel: SolarPanelConfig) => {
    if (!panel._id) {
      setPanelMessage({
        type: 'error',
        text: 'No se pudo identificar el panel para eliminarlo.',
      });
      return;
    }
    if (!window.confirm('¿Desea eliminar este panel?')) return;
    try {
      await executeMutation(DELETE_PANEL_MUTATION, { id: panel._id });
      setPanelMessage({ type: 'success', text: 'Panel eliminado correctamente.' });
      if (detailModal?.type === 'panel' && detailModal.data._id === panel._id) {
        setDetailModal(null);
      }
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setPanelMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo eliminar el panel.',
      });
    }
  };

  const deleteBattery = async (battery: BatteryConfig) => {
    if (!battery._id) {
      setBatteryMessage({
        type: 'error',
        text: 'No se pudo identificar la batería para eliminarla.',
      });
      return;
    }
    if (!window.confirm('¿Desea eliminar esta batería?')) return;
    try {
      await executeMutation(DELETE_BATTERY_MUTATION, { id: battery._id });
      setBatteryMessage({ type: 'success', text: 'Batería eliminada correctamente.' });
      if (detailModal?.type === 'battery' && detailModal.data._id === battery._id) {
        setDetailModal(null);
      }
      await onRefresh?.();
    } catch (error) {
      console.error(error);
      setBatteryMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo eliminar la batería.',
      });
    }
  };

  const panelDetailRows = (panel: SolarPanelConfig) =>
    [
      {
        label: 'Potencia por panel',
        value:
          panel.ratedPowerKw !== undefined ? `${panel.ratedPowerKw.toFixed(2)} kW` : 'Sin dato',
      },
      {
        label: 'Paneles instalados',
        value: panel.quantity !== undefined ? `${panel.quantity}` : 'Sin dato',
      },
      {
        label: 'Strings activos',
        value: panel.strings !== undefined ? `${panel.strings}` : 'Sin dato',
      },
      panel.efficiencyPercent !== undefined
        ? { label: 'Eficiencia nominal', value: `${panel.efficiencyPercent.toFixed(1)} %` }
        : null,
      panel.areaM2 !== undefined
        ? { label: 'Área por panel', value: `${panel.areaM2.toFixed(2)} m²` }
        : null,
      panel.tiltDegrees !== undefined
        ? { label: 'Inclinación', value: `${panel.tiltDegrees.toFixed(1)}°` }
        : null,
      panel.orientation ? { label: 'Orientación', value: panel.orientation } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

  const batteryDetailRows = (battery: BatteryConfig) =>
    [
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
      battery.maxDepthOfDischargePercent !== undefined
        ? {
            label: 'Profundidad de descarga',
            value: `${battery.maxDepthOfDischargePercent.toFixed(0)} %`,
          }
        : null,
      battery.chargeRateKw !== undefined
        ? { label: 'Velocidad de carga', value: `${battery.chargeRateKw.toFixed(1)} kW` }
        : null,
      battery.dischargeRateKw !== undefined
        ? { label: 'Velocidad de descarga', value: `${battery.dischargeRateKw.toFixed(1)} kW` }
        : null,
      battery.efficiencyPercent !== undefined
        ? { label: 'Eficiencia', value: `${battery.efficiencyPercent.toFixed(0)} %` }
        : null,
      battery.nominalVoltage !== undefined
        ? { label: 'Voltaje nominal', value: `${battery.nominalVoltage.toFixed(1)} V` }
        : null,
      battery.chemistry ? { label: 'Química', value: battery.chemistry } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-3xl border border-white/50 bg-white/70 p-6 backdrop-blur-xl shadow-[0_30px_70px_-50px_rgba(15,23,42,0.65)]">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5">
          <Info className="h-5 w-5 text-blue-500" />
          <div className="grid w-full grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            {systemSummary.map((entry) => (
              <div key={entry.label}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{entry.label}</p>
                <p className="text-sm font-semibold text-slate-700">{entry.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl shadow-[0_30px_70px_-50px_rgba(15,23,42,0.65)]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Paneles solares</h2>
            <p className="text-sm text-slate-500">
              Administre la ficha técnica de los arreglos fotovoltaicos registrados en el gemelo
              digital.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openPanelModal('create')}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            Agregar panel
          </button>
        </header>

        {panelMessage && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              panelMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {panelMessage.text}
          </div>
        )}

        {panels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 py-14 text-center">
            <Layers className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-600">
              No hay paneles registrados todavía
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Añada la información técnica del primer arreglo para habilitar proyecciones
              ajustadas a la realidad de la microrred.
            </p>
            <button
              type="button"
              onClick={() => openPanelModal('create')}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              Registrar panel
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {panels.map((panel) => {
              const specs = buildPanelSpecs(panel);
              return (
                <article
                  key={panel._id ?? panel.name}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {panel.name || 'Panel sin nombre'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {panel.manufacturer ?? 'Fabricante desconocido'}
                        {panel.model ? ` • ${panel.model}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusToneClasses.success}`}
                    >
                      Operativo
                    </span>
                  </header>

                  <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    {specs.map((spec) => (
                      <div key={`${panel._id ?? panel.name}-${spec.label}`} className="rounded-2xl bg-slate-50/70 px-3 py-2">
                        <dt className="text-xs uppercase tracking-wide text-slate-400">
                          {spec.label}
                        </dt>
                        <dd className="text-sm font-semibold text-slate-700">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <Layers className="h-4 w-4 text-blue-500" />
                      Última actualización:{' '}
                      <strong className="font-semibold text-slate-700">
                        {formatDateTime(panel.updatedAt ?? panel.createdAt)}
                      </strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openPanelModal('edit', panel)}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailModal({ type: 'panel', data: panel })}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver detalles
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePanel(panel)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 backdrop-blur-xl shadow-[0_30px_70px_-50px_rgba(15,23,42,0.65)]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Bancos de baterías</h2>
            <p className="text-sm text-slate-500">
              Controle capacidades, potencias y observaciones de los sistemas de almacenamiento.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openBatteryModal('create')}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-400/25 transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            Agregar batería
          </button>
        </header>

        {batteryMessage && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              batteryMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {batteryMessage.text}
          </div>
        )}

        {batteries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 py-14 text-center">
            <BatteryCharging className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-600">
              No hay bancos de baterías registrados
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Añada una o varias configuraciones de almacenamiento para modelar la autonomía del
              sistema frente a apagones o días nublados.
            </p>
            <button
              type="button"
              onClick={() => openBatteryModal('create')}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-400/25 transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              Registrar batería
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {batteries.map((battery) => {
              const specs = buildBatterySpecs(battery);
              return (
                <article
                  key={battery._id ?? battery.name}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {battery.name || 'Batería sin nombre'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {battery.manufacturer ?? 'Proveedor desconocido'}
                        {battery.model ? ` • ${battery.model}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusToneClasses.success}`}
                    >
                      Disponible
                    </span>
                  </header>

                  <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    {specs.map((spec) => (
                      <div key={`${battery._id ?? battery.name}-${spec.label}`} className="rounded-2xl bg-slate-50/70 px-3 py-2">
                        <dt className="text-xs uppercase tracking-wide text-slate-400">
                          {spec.label}
                        </dt>
                        <dd className="text-sm font-semibold text-slate-700">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <BatteryCharging className="h-4 w-4 text-emerald-500" />
                      Última actualización:{' '}
                      <strong className="font-semibold text-slate-700">
                        {formatDateTime(battery.updatedAt ?? battery.createdAt)}
                      </strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openBatteryModal('edit', battery)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailModal({ type: 'battery', data: battery })}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver detalles
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBattery(battery)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {panelModalOpen && (
        <ModalShell
          title={panelModalMode === 'edit' ? 'Editar panel solar' : 'Registrar panel solar'}
          subtitle="Capture la información técnica del arreglo para mejorar las proyecciones."
          onClose={() => setPanelModalOpen(false)}
        >
          {panelModalMessage && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                panelModalMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {panelModalMessage.text}
            </div>
          )}
          <form onSubmit={handlePanelSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre comercial" required>
                <input
                  required
                  value={panelForm.name}
                  onChange={handlePanelInput('name')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Fabricante">
                <input
                  value={panelForm.manufacturer}
                  onChange={handlePanelInput('manufacturer')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Modelo">
                <input
                  value={panelForm.model}
                  onChange={handlePanelInput('model')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Potencia por panel (kW)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={panelForm.ratedPowerKw}
                  onChange={handlePanelInput('ratedPowerKw')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Paneles instalados" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={panelForm.quantity}
                  onChange={handlePanelInput('quantity')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Strings activos" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={panelForm.strings}
                  onChange={handlePanelInput('strings')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Eficiencia nominal (%)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={panelForm.efficiencyPercent}
                  onChange={handlePanelInput('efficiencyPercent')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Área por panel (m²)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={panelForm.areaM2}
                  onChange={handlePanelInput('areaM2')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Inclinación (°)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={panelForm.tiltDegrees}
                  onChange={handlePanelInput('tiltDegrees')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Orientación">
                <input
                  value={panelForm.orientation}
                  onChange={handlePanelInput('orientation')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Observaciones" className="sm:col-span-2">
                <textarea
                  value={panelForm.notes}
                  onChange={handlePanelInput('notes')}
                  className="w-full min-h-[96px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPanelModalOpen(false);
                  setPanelForm(emptyPanelForm);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={panelLoading}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {panelLoading
                  ? 'Guardando...'
                  : panelModalMode === 'edit'
                  ? 'Actualizar panel'
                  : 'Crear panel'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {batteryModalOpen && (
        <ModalShell
          title={batteryModalMode === 'edit' ? 'Editar banco de baterías' : 'Registrar batería'}
          subtitle="Documente las características del almacenamiento para planificar la autonomía energética."
          onClose={() => setBatteryModalOpen(false)}
        >
          {batteryModalMessage && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                batteryModalMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {batteryModalMessage.text}
            </div>
          )}
          <form onSubmit={handleBatterySubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre comercial" required>
                <input
                  required
                  value={batteryForm.name}
                  onChange={handleBatteryInput('name')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Fabricante">
                <input
                  value={batteryForm.manufacturer}
                  onChange={handleBatteryInput('manufacturer')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Modelo">
                <input
                  value={batteryForm.model}
                  onChange={handleBatteryInput('model')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Capacidad (kWh)" required>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={batteryForm.capacityKwh}
                  onChange={handleBatteryInput('capacityKwh')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Módulos instalados" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={batteryForm.quantity}
                  onChange={handleBatteryInput('quantity')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Profundidad de descarga (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={batteryForm.maxDepthOfDischargePercent}
                  onChange={handleBatteryInput('maxDepthOfDischargePercent')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Velocidad de carga (kW)">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={batteryForm.chargeRateKw}
                  onChange={handleBatteryInput('chargeRateKw')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Velocidad de descarga (kW)">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={batteryForm.dischargeRateKw}
                  onChange={handleBatteryInput('dischargeRateKw')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Eficiencia (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={batteryForm.efficiencyPercent}
                  onChange={handleBatteryInput('efficiencyPercent')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Química">
                <input
                  value={batteryForm.chemistry}
                  onChange={handleBatteryInput('chemistry')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Voltaje nominal (V)">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={batteryForm.nominalVoltage}
                  onChange={handleBatteryInput('nominalVoltage')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Observaciones" className="sm:col-span-2">
                <textarea
                  value={batteryForm.notes}
                  onChange={handleBatteryInput('notes')}
                  className="w-full min-h-[96px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setBatteryModalOpen(false);
                  setBatteryForm(emptyBatteryForm);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={batteryLoading}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-400/25 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {batteryLoading
                  ? 'Guardando...'
                  : batteryModalMode === 'edit'
                  ? 'Actualizar batería'
                  : 'Crear batería'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {detailModal && (
        <ModalShell
          title={
            detailModal.type === 'panel'
              ? detailModal.data.name || 'Panel sin nombre'
              : detailModal.data.name || 'Batería sin nombre'
          }
          subtitle={
            detailModal.type === 'panel'
              ? `${detailModal.data.manufacturer ?? 'Fabricante desconocido'}${
                  detailModal.data.model ? ` • ${detailModal.data.model}` : ''
                }`
              : `${detailModal.data.manufacturer ?? 'Proveedor desconocido'}${
                  detailModal.data.model ? ` • ${detailModal.data.model}` : ''
                }`
          }
          onClose={() => setDetailModal(null)}
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {(detailModal.type === 'panel'
                ? panelDetailRows(detailModal.data)
                : batteryDetailRows(detailModal.data)
              ).map((row) => (
                <div
                  key={`${detailModal.type}-${row.label}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{row.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{row.value}</p>
                </div>
              ))}
            </div>

            {(detailModal.data.notes ?? '').trim().length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Observaciones</p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                  {detailModal.data.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Última actualización:{' '}
                <strong className="font-semibold text-slate-700">
                  {formatDateTime(detailModal.data.updatedAt ?? detailModal.data.createdAt)}
                </strong>
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (detailModal.type === 'panel') {
                      deletePanel(detailModal.data);
                    } else {
                      deleteBattery(detailModal.data);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash className="h-4 w-4" />
                  Eliminar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (detailModal.type === 'panel') {
                      openPanelModal('edit', detailModal.data);
                    } else {
                      openBatteryModal('edit', detailModal.data);
                    }
                    setDetailModal(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

function ModalShell({ title, subtitle, onClose, children }: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}

function Field({ label, children, required, className }: FieldProps) {
  return (
    <label
      className={`flex flex-col gap-1 ${className ?? ''}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}
