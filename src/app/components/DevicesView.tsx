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
  Image,
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
  manufacturer: string;
  model: string;
  ratedPowerKw: string;
  quantity: string;
  tiltDegrees: string;
  orientation: string;
}

interface BatteryFormState {
  _id?: string;
  manufacturer: string;
  model: string;
  capacityKwh: string;
  quantity: string;
}

type DetailModalState =
  | { type: 'panel'; data: SolarPanelConfig }
  | { type: 'battery'; data: BatteryConfig }
  | null;

const emptyPanelForm: PanelFormState = {
  manufacturer: '',
  model: '',
  ratedPowerKw: '',
  quantity: '',
  tiltDegrees: '',
  orientation: '',
};

const emptyBatteryForm: BatteryFormState = {
  manufacturer: '',
  model: '',
  capacityKwh: '',
  quantity: '',
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

const formatPanelTitle = (panel: SolarPanelConfig) => {
  const maker = panel.manufacturer?.trim();
  const model = panel.model?.trim();
  if (maker && model) return `${maker} ${model}`;
  return maker || model || 'Panel sin datos';
};

const formatBatteryTitle = (battery: BatteryConfig) => {
  const maker = battery.manufacturer?.trim();
  const model = battery.model?.trim();
  if (maker && model) return `${maker} ${model}`;
  return maker || model || 'Batería sin datos';
};

const toPanelFormState = (panel: SolarPanelConfig): PanelFormState => ({
  _id: panel._id,
  manufacturer: panel.manufacturer ?? '',
  model: panel.model ?? '',
  ratedPowerKw: panel.ratedPowerKw !== undefined ? panel.ratedPowerKw.toString() : '',
  quantity: panel.quantity !== undefined ? panel.quantity.toString() : '',
  tiltDegrees: panel.tiltDegrees !== undefined ? panel.tiltDegrees.toString() : '',
  orientation: panel.orientation ?? '',
});

const toBatteryFormState = (battery: BatteryConfig): BatteryFormState => ({
  _id: battery._id,
  manufacturer: battery.manufacturer ?? '',
  model: battery.model ?? '',
  capacityKwh: battery.capacityKwh !== undefined ? battery.capacityKwh.toString() : '',
  quantity: battery.quantity !== undefined ? battery.quantity.toString() : '',
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

  const [cleanlinessModalOpen, setCleanlinessModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cleanlinessLoading, setCleanlinessLoading] = useState(false);
  const [cleanlinessResult, setCleanlinessResult] = useState<{
    clasificacion: 'limpio' | 'sucio';
    porcentaje_limpio: number;
    porcentaje_sucio: number;
  } | null>(null);
  const [cleanlinessError, setCleanlinessError] = useState<string | null>(null);

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
        label: 'Potencia nominal',
        value:
          panel.ratedPowerKw !== undefined ? `${panel.ratedPowerKw.toFixed(2)} kW` : 'Sin dato',
      },
      {
        label: 'Unidades instaladas',
        value: panel.quantity !== undefined ? `${panel.quantity}` : 'Sin dato',
      },
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
        label: 'Capacidad por módulo',
        value:
          battery.capacityKwh !== undefined
            ? `${battery.capacityKwh.toFixed(1)} kWh`
            : 'Sin dato',
      },
      {
        label: 'Unidades instaladas',
        value: battery.quantity !== undefined ? `${battery.quantity}` : 'Sin dato',
      },
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
      manufacturer: panelForm.manufacturer.trim(),
      model: panelForm.model.trim() || undefined,
      ratedPowerKw: parseNumber(panelForm.ratedPowerKw),
      quantity: parseNumber(panelForm.quantity),
      tiltDegrees: parseNumber(panelForm.tiltDegrees),
      orientation: panelForm.orientation.trim() || undefined,
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
      manufacturer: batteryForm.manufacturer.trim(),
      model: batteryForm.model.trim() || undefined,
      capacityKwh: parseNumber(batteryForm.capacityKwh),
      quantity: parseNumber(batteryForm.quantity),
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

  const panelDetailRows = (panel: SolarPanelConfig) => buildPanelSpecs(panel);

  const batteryDetailRows = (battery: BatteryConfig) => buildBatterySpecs(battery);

  const openCleanlinessModal = () => {
    setCleanlinessModalOpen(true);
    setSelectedImage(null);
    setImagePreview(null);
    setCleanlinessResult(null);
    setCleanlinessError(null);
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setCleanlinessResult(null);
      setCleanlinessError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePanel = async () => {
    if (!selectedImage) {
      setCleanlinessError('Por favor seleccione una imagen');
      return;
    }

    setCleanlinessLoading(true);
    setCleanlinessError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await fetch('http://localhost:8000/api/classify-panel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al analizar la imagen');
      }

      const result = await response.json();
      setCleanlinessResult(result);
    } catch (error) {
      console.error('Error analyzing panel:', error);
      setCleanlinessError(
        error instanceof Error ? error.message : 'Error inesperado al analizar la imagen'
      );
    } finally {
      setCleanlinessLoading(false);
    }
  };

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
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCleanlinessModal}
              className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition-all hover:bg-amber-50"
            >
              <Image className="h-4 w-4" />
              Comprobar limpieza
            </button>
            <button
              type="button"
              onClick={() => openPanelModal('create')}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              Agregar panel
            </button>
          </div>
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
                  key={panel._id ?? `${panel.manufacturer}-${panel.model ?? 'sin-modelo'}`}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {formatPanelTitle(panel)}
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
                      <div
                        key={`${panel._id ?? `${panel.manufacturer}-${panel.model ?? 'sin-modelo'}`}-${spec.label}`}
                        className="rounded-2xl bg-slate-50/70 px-3 py-2"
                      >
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
                  key={battery._id ?? `${battery.manufacturer}-${battery.model ?? 'sin-modelo'}`}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {formatBatteryTitle(battery)}
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
                      <div
                        key={`${battery._id ?? `${battery.manufacturer}-${battery.model ?? 'sin-modelo'}`}-${spec.label}`}
                        className="rounded-2xl bg-slate-50/70 px-3 py-2"
                      >
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
              <Field label="Fabricante" required>
                <input
                  required
                  value={panelForm.manufacturer}
                  onChange={handlePanelInput('manufacturer')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Modelo (opcional)">
                <input
                  value={panelForm.model}
                  onChange={handlePanelInput('model')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Potencia (kW)" required>
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
              <Field label="Cantidad instalada" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={panelForm.quantity}
                  onChange={handlePanelInput('quantity')}
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
              <Field label="Orientación (opcional)">
                <input
                  value={panelForm.orientation}
                  onChange={handlePanelInput('orientation')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
              <Field label="Fabricante" required>
                <input
                  required
                  value={batteryForm.manufacturer}
                  onChange={handleBatteryInput('manufacturer')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Modelo (opcional)">
                <input
                  value={batteryForm.model}
                  onChange={handleBatteryInput('model')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </Field>
              <Field label="Capacidad (kW)" required>
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
              <Field label="Cantidad instalada" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={batteryForm.quantity}
                  onChange={handleBatteryInput('quantity')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
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
              ? formatPanelTitle(detailModal.data)
              : formatBatteryTitle(detailModal.data)
          }
          subtitle={
            detailModal.type === 'panel'
              ? detailModal.data.manufacturer ?? 'Fabricante desconocido'
              : detailModal.data.manufacturer ?? 'Proveedor desconocido'
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

      {cleanlinessModalOpen && (
        <ModalShell
          title="Análisis de limpieza de paneles"
          subtitle="Suba una fotografía del panel solar para evaluar su estado de limpieza"
          onClose={() => setCleanlinessModalOpen(false)}
        >
          <div className="space-y-5">
            {/* Upload section - only show if no results */}
            {!cleanlinessResult && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-amber-400 hover:bg-amber-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="panel-image-upload"
                  />
                  <label
                    htmlFor="panel-image-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="rounded-full bg-amber-100 p-3">
                      <Image className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {selectedImage ? selectedImage.name : 'Seleccionar imagen del panel'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        JPG, PNG o cualquier formato de imagen
                      </p>
                    </div>
                  </label>
                </div>

                {/* Image preview */}
                {imagePreview && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    <img
                      src={imagePreview}
                      alt="Vista previa del panel"
                      className="w-full max-h-80 object-contain bg-slate-50"
                    />
                  </div>
                )}

                {/* Error message */}
                {cleanlinessError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
                    {cleanlinessError}
                  </div>
                )}

                {/* Analyze button */}
                {selectedImage && (
                  <button
                    type="button"
                    onClick={analyzePanel}
                    disabled={cleanlinessLoading}
                    className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600"
                  >
                    {cleanlinessLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analizando imagen...
                      </span>
                    ) : (
                      'Analizar estado del panel'
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Results section */}
            {cleanlinessResult && (
              <div className="space-y-5">
                {/* Status badge */}
                <div className="text-center py-4">
                  <div
                    className={`inline-flex items-center gap-3 rounded-xl px-8 py-4 shadow-sm ${
                      cleanlinessResult.clasificacion === 'limpio'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <span className="text-3xl">
                      {cleanlinessResult.clasificacion === 'limpio' ? '✓' : '⚠'}
                    </span>
                    <div className="text-left">
                      <p
                        className={`text-lg font-bold ${
                          cleanlinessResult.clasificacion === 'limpio'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {cleanlinessResult.clasificacion === 'limpio'
                          ? 'Panel Limpio'
                          : 'Panel con Suciedad'}
                      </p>
                      <p className="text-xs text-slate-600">Análisis completado</p>
                    </div>
                  </div>
                </div>

                {/* Percentages */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Limpieza
                      </p>
                      <p className="text-3xl font-bold text-emerald-600">
                        {cleanlinessResult.porcentaje_limpio.toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                        style={{ width: `${cleanlinessResult.porcentaje_limpio}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Suciedad
                      </p>
                      <p className="text-3xl font-bold text-rose-600">
                        {cleanlinessResult.porcentaje_sucio.toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-700 ease-out"
                        style={{ width: `${cleanlinessResult.porcentaje_sucio}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">
                    Recomendación
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {cleanlinessResult.clasificacion === 'limpio'
                      ? 'El panel se encuentra en buen estado de limpieza. La producción de energía no debería verse afectada significativamente.'
                      : 'Se recomienda realizar una limpieza del panel solar. La suciedad acumulada puede reducir la eficiencia de producción energética hasta en un 25%.'}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      setCleanlinessResult(null);
                      setCleanlinessError(null);
                    }}
                    className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Analizar otro panel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCleanlinessModalOpen(false)}
                    className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
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
