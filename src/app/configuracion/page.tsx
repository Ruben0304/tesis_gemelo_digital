'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { BatteryConfig, SolarPanelConfig, BlackoutSchedule } from '@/types';
import Link from 'next/link';

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

interface BlackoutIntervalForm {
  id: string;
  start: string;
  end: string;
}

interface BlackoutFormState {
  date: string;
  province: string;
  municipality: string;
  notes: string;
  intervals: BlackoutIntervalForm[];
}

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

const emptyBlackoutForm: BlackoutFormState = {
  date: '',
  province: '',
  municipality: '',
  notes: '',
  intervals: [],
};

type StatusMessage = { type: 'success' | 'error'; text: string } | null;

function createIntervalRow(): BlackoutIntervalForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    start: '',
    end: '',
  };
}

export default function ConfiguracionPage() {
  const [panels, setPanels] = useState<SolarPanelConfig[]>([]);
  const [batteries, setBatteries] = useState<BatteryConfig[]>([]);
  const [panelForm, setPanelForm] = useState<PanelFormState>(emptyPanelForm);
  const [batteryForm, setBatteryForm] = useState<BatteryFormState>(emptyBatteryForm);
  const [blackouts, setBlackouts] = useState<BlackoutSchedule[]>([]);
  const [blackoutForm, setBlackoutForm] = useState<BlackoutFormState>(() => ({
    ...emptyBlackoutForm,
    date: new Date().toISOString().split('T')[0],
    intervals: [createIntervalRow()],
  }));
  const [panelLoading, setPanelLoading] = useState(false);
  const [batteryLoading, setBatteryLoading] = useState(false);
  const [blackoutLoading, setBlackoutLoading] = useState(false);
  const [panelMessage, setPanelMessage] = useState<StatusMessage>(null);
  const [batteryMessage, setBatteryMessage] = useState<StatusMessage>(null);
  const [blackoutMessage, setBlackoutMessage] = useState<StatusMessage>(null);
  const [editingBlackoutDate, setEditingBlackoutDate] = useState<string | null>(null);

  const isPanelEditing = useMemo(() => Boolean(panelForm._id), [panelForm._id]);
  const isBatteryEditing = useMemo(() => Boolean(batteryForm._id), [batteryForm._id]);
  const isBlackoutEditing = useMemo(() => Boolean(editingBlackoutDate), [editingBlackoutDate]);

  const fetchPanels = async () => {
    try {
      const response = await fetch('/api/paneles');
      if (!response.ok) {
        throw new Error('No se pudieron obtener los paneles.');
      }
      const data = await response.json();
      setPanels(data.items ?? []);
    } catch (error) {
      console.error(error);
      setPanelMessage({ type: 'error', text: 'Error al cargar paneles.' });
    }
  };

  const fetchBatteries = async () => {
    try {
      const response = await fetch('/api/baterias');
      if (!response.ok) {
        throw new Error('No se pudieron obtener las baterías.');
      }
      const data = await response.json();
      setBatteries(data.items ?? []);
    } catch (error) {
      console.error(error);
      setBatteryMessage({ type: 'error', text: 'Error al cargar baterías.' });
    }
  };

  const fetchBlackouts = async () => {
    try {
      const from = new Date();
      from.setDate(from.getDate() - 1);
      const response = await fetch(`/api/blackouts?from=${from.toISOString()}&limit=60`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener los apagones programados.');
      }
      const data = await response.json();
      setBlackouts(data.items ?? []);
    } catch (error) {
      console.error(error);
      setBlackoutMessage({ type: 'error', text: 'Error al cargar apagones programados.' });
    }
  };

  useEffect(() => {
    fetchPanels();
    fetchBatteries();
    fetchBlackouts();
  }, []);

  const handlePanelInput =
    (field: keyof PanelFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setPanelForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleBatteryInput =
    (field: keyof BatteryFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setBatteryForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const parseNumber = (value: string): number | undefined => {
    if (value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleBlackoutInput =
    (field: keyof Omit<BlackoutFormState, 'intervals'>) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setBlackoutForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleIntervalChange =
    (id: string, field: 'start' | 'end') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setBlackoutForm((prev) => ({
        ...prev,
        intervals: prev.intervals.map((interval) =>
          interval.id === id ? { ...interval, [field]: value } : interval
        ),
      }));
    };

  const addIntervalRow = () => {
    setBlackoutForm((prev) => ({
      ...prev,
      intervals: [...prev.intervals, createIntervalRow()],
    }));
  };

  const removeIntervalRow = (id: string) => {
    setBlackoutForm((prev) => {
      if (prev.intervals.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        intervals: prev.intervals.filter((interval) => interval.id !== id),
      };
    });
  };

  const resetBlackoutForm = () => {
    setBlackoutForm({
      ...emptyBlackoutForm,
      date: new Date().toISOString().split('T')[0],
      intervals: [createIntervalRow()],
    });
    setEditingBlackoutDate(null);
  };

  const toTimeInputValue = (isoString: string): string => {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const editBlackout = (schedule: BlackoutSchedule) => {
    setBlackoutForm({
      date: new Date(schedule.date).toISOString().split('T')[0],
      province: schedule.province ?? '',
      municipality: schedule.municipality ?? '',
      notes: schedule.notes ?? '',
      intervals:
        schedule.intervals.length > 0
          ? schedule.intervals.map((interval) => ({
              id: `${interval.start}-${Math.random().toString(36).slice(2, 8)}`,
              start: toTimeInputValue(interval.start),
              end: toTimeInputValue(interval.end),
            }))
          : [createIntervalRow()],
    });
    setEditingBlackoutDate(new Date(schedule.date).toISOString().split('T')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateBlackoutIntervals = () => {
    if (!blackoutForm.date) {
      setBlackoutMessage({ type: 'error', text: 'Seleccione un día para programar el apagón.' });
      return null;
    }

    const validIntervals = blackoutForm.intervals
      .map((interval) => {
        if (!interval.start || !interval.end) {
          return null;
        }
        const start = new Date(`${blackoutForm.date}T${interval.start}:00`);
        const end = new Date(`${blackoutForm.date}T${interval.end}:00`);
        if (!(start instanceof Date) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          setBlackoutMessage({
            type: 'error',
            text: 'Las horas especificadas son inválidas.',
          });
          return null;
        }
        if (end <= start) {
          setBlackoutMessage({
            type: 'error',
            text: 'Cada intervalo debe tener un fin posterior al inicio.',
          });
          return null;
        }
        return {
          start,
          end,
        };
      })
      .filter((interval): interval is { start: Date; end: Date } => Boolean(interval));

    if (validIntervals.length === 0) {
      setBlackoutMessage({
        type: 'error',
        text: 'Añada al menos un intervalo válido de apagón.',
      });
      return null;
    }

    return validIntervals;
  };

  const handleBlackoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blackoutLoading) return;
    setBlackoutMessage(null);

    const validIntervals = validateBlackoutIntervals();
    if (!validIntervals) {
      return;
    }

    const payload = {
      date: blackoutForm.date,
      province: blackoutForm.province.trim() || undefined,
      municipality: blackoutForm.municipality.trim() || undefined,
      notes: blackoutForm.notes.trim() || undefined,
      intervals: validIntervals.map((interval) => ({
        start: interval.start.toISOString(),
        end: interval.end.toISOString(),
      })),
    };

    try {
      setBlackoutLoading(true);
      const response = await fetch(`/api/blackouts/${blackoutForm.date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo guardar el apagón.');
      }

      setBlackoutMessage({
        type: 'success',
        text: isBlackoutEditing ? 'Apagón actualizado correctamente.' : 'Apagón registrado correctamente.',
      });
      await fetchBlackouts();
      resetBlackoutForm();
    } catch (error) {
      console.error(error);
      setBlackoutMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado al guardar el apagón.',
      });
    } finally {
      setBlackoutLoading(false);
    }
  };

  const deleteBlackoutSchedule = async (date: string) => {
    if (!confirm('¿Desea eliminar la programación de apagones para este día?')) return;
    try {
      const response = await fetch(`/api/blackouts/${encodeURIComponent(date)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo eliminar el apagón.');
      }
      setBlackoutMessage({ type: 'success', text: 'Apagón eliminado correctamente.' });
      await fetchBlackouts();
      if (editingBlackoutDate === date) {
        resetBlackoutForm();
      }
    } catch (error) {
      console.error(error);
      setBlackoutMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo eliminar el apagón.',
      });
    }
  };

  const formatScheduleDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  const formatScheduleTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePanelSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPanelLoading(true);
    setPanelMessage(null);

    const payload = {
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
    };

    try {
      const response = await fetch(panelForm._id ? `/api/paneles/${panelForm._id}` : '/api/paneles', {
        method: panelForm._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo guardar el panel.');
      }

      setPanelMessage({
        type: 'success',
        text: panelForm._id ? 'Panel actualizado correctamente.' : 'Panel creado correctamente.',
      });
      setPanelForm(emptyPanelForm);
      await fetchPanels();
    } catch (error) {
      console.error(error);
      setPanelMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado al guardar el panel.',
      });
    } finally {
      setPanelLoading(false);
    }
  };

  const handleBatterySubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBatteryLoading(true);
    setBatteryMessage(null);

    const payload = {
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
    };

    try {
      const response = await fetch(
        batteryForm._id ? `/api/baterias/${batteryForm._id}` : '/api/baterias',
        {
          method: batteryForm._id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo guardar la batería.');
      }

      setBatteryMessage({
        type: 'success',
        text: batteryForm._id ? 'Batería actualizada correctamente.' : 'Batería creada correctamente.',
      });
      setBatteryForm(emptyBatteryForm);
      await fetchBatteries();
    } catch (error) {
      console.error(error);
      setBatteryMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error inesperado al guardar la batería.',
      });
    } finally {
      setBatteryLoading(false);
    }
  };

  const editPanel = (panel: SolarPanelConfig) => {
    setPanelForm({
      _id: panel._id,
      name: panel.name ?? '',
      manufacturer: panel.manufacturer ?? '',
      model: panel.model ?? '',
      ratedPowerKw: panel.ratedPowerKw?.toString() ?? '',
      quantity: panel.quantity?.toString() ?? '',
      strings: panel.strings?.toString() ?? '',
      efficiencyPercent: panel.efficiencyPercent?.toString() ?? '',
      areaM2: panel.areaM2?.toString() ?? '',
      tiltDegrees: panel.tiltDegrees?.toString() ?? '',
      orientation: panel.orientation ?? '',
      notes: panel.notes ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editBattery = (battery: BatteryConfig) => {
    setBatteryForm({
      _id: battery._id,
      name: battery.name ?? '',
      manufacturer: battery.manufacturer ?? '',
      model: battery.model ?? '',
      capacityKwh: battery.capacityKwh?.toString() ?? '',
      quantity: battery.quantity?.toString() ?? '',
      maxDepthOfDischargePercent: battery.maxDepthOfDischargePercent?.toString() ?? '',
      chargeRateKw: battery.chargeRateKw?.toString() ?? '',
      dischargeRateKw: battery.dischargeRateKw?.toString() ?? '',
      efficiencyPercent: battery.efficiencyPercent?.toString() ?? '',
      chemistry: battery.chemistry ?? '',
      nominalVoltage: battery.nominalVoltage?.toString() ?? '',
      notes: battery.notes ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePanel = async (id: string) => {
    if (!confirm('¿Desea eliminar este panel?')) return;
    try {
      const response = await fetch(`/api/paneles/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo eliminar el panel.');
      }
      setPanelMessage({ type: 'success', text: 'Panel eliminado.' });
      await fetchPanels();
    } catch (error) {
      console.error(error);
      setPanelMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo eliminar el panel.',
      });
    }
  };

  const deleteBattery = async (id: string) => {
    if (!confirm('¿Desea eliminar esta batería?')) return;
    try {
      const response = await fetch(`/api/baterias/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'No se pudo eliminar la batería.');
      }
      setBatteryMessage({ type: 'success', text: 'Batería eliminada.' });
      await fetchBatteries();
    } catch (error) {
      console.error(error);
      setBatteryMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo eliminar la batería.',
      });
    }
  };

  const resetPanelForm = () => {
    setPanelForm(emptyPanelForm);
  };

  const resetBatteryForm = () => {
    setBatteryForm(emptyBatteryForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white pb-16">
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Configuración de Equipos</h1>
            <p className="text-sm text-gray-400">
              Administra la ficha técnica de paneles solares y baterías para alimentar el gemelo digital.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-green-400/30 bg-green-400/10 px-4 py-2 text-sm font-medium text-green-300 hover:bg-green-400/20 transition-colors"
          >
            Regresar al tablero
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Paneles Solares</h2>
              <p className="text-xs text-gray-400">
                Registre la capacidad nominal de los arreglos fotovoltaicos para que las proyecciones sean precisas.
              </p>
            </div>
            <button
              onClick={resetPanelForm}
              className="text-xs text-gray-300 border border-gray-700 rounded-md px-3 py-1 hover:bg-gray-800/80 transition-colors"
            >
              Nuevo panel
            </button>
          </div>

          {panelMessage && (
            <div
              className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                panelMessage.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/40 bg-red-500/10 text-red-200'
              }`}
            >
              {panelMessage.text}
            </div>
          )}

          <form onSubmit={handlePanelSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Nombre comercial *
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={panelForm.name}
                  onChange={handlePanelInput('name')}
                  required
                />
              </label>
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Fabricante
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={panelForm.manufacturer}
                  onChange={handlePanelInput('manufacturer')}
                />
              </label>
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Modelo
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={panelForm.model}
                  onChange={handlePanelInput('model')}
                />
              </label>
            </div>

            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Potencia por panel (kW) *
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={panelForm.ratedPowerKw}
                onChange={handlePanelInput('ratedPowerKw')}
                required
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Paneles instalados *
              <input
                type="number"
                min="1"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={panelForm.quantity}
                onChange={handlePanelInput('quantity')}
                required
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Strings activos *
              <input
                type="number"
                min="1"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={panelForm.strings}
                onChange={handlePanelInput('strings')}
                required
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Eficiencia (%)
              <input
                type="number"
                step="0.1"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={panelForm.efficiencyPercent}
                onChange={handlePanelInput('efficiencyPercent')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Área por panel (m²)
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={panelForm.areaM2}
                onChange={handlePanelInput('areaM2')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Inclinación (°)
              <input
                type="number"
                step="0.1"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={panelForm.tiltDegrees}
                onChange={handlePanelInput('tiltDegrees')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Orientación
              <input
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={panelForm.orientation}
                onChange={handlePanelInput('orientation')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1 md:col-span-2">
              Observaciones
              <textarea
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none min-h-[80px]"
                value={panelForm.notes}
                onChange={handlePanelInput('notes')}
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-end gap-3">
              {isPanelEditing && (
                <button
                  type="button"
                  onClick={resetPanelForm}
                  className="rounded-md border border-gray-700 px-4 py-2 text-xs text-gray-300 hover:bg-gray-800/80 transition-colors"
                >
                  Cancelar edición
                </button>
              )}
              <button
                type="submit"
                disabled={panelLoading}
                className="rounded-md border border-green-400/40 bg-green-400/10 px-5 py-2 text-sm font-semibold text-green-200 hover:bg-green-400/20 transition-colors disabled:opacity-60"
              >
                {panelLoading ? 'Guardando...' : isPanelEditing ? 'Actualizar panel' : 'Crear panel'}
              </button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Modelo</th>
                  <th className="px-3 py-2 text-left">Potencia kW</th>
                  <th className="px-3 py-2 text-left">Paneles</th>
                  <th className="px-3 py-2 text-left">Strings</th>
                  <th className="px-3 py-2 text-left">Última actualización</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {panels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                      No hay paneles registrados todavía.
                    </td>
                  </tr>
                ) : (
                  panels.map((panel) => (
                    <tr key={panel._id} className="border-b border-gray-900/70">
                      <td className="px-3 py-3">
                        <p className="font-medium text-white">{panel.name}</p>
                        {panel.manufacturer && (
                          <p className="text-xs text-gray-500">{panel.manufacturer}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-400">{panel.model ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3">{panel.ratedPowerKw?.toFixed(2) ?? '—'}</td>
                      <td className="px-3 py-3">{panel.quantity ?? '—'}</td>
                      <td className="px-3 py-3">{panel.strings ?? '—'}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {panel.updatedAt
                          ? new Date(panel.updatedAt).toLocaleString('es-ES')
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-right space-x-2">
                        <button
                          onClick={() => editPanel(panel)}
                          className="rounded-md border border-blue-400/40 px-3 py-1 text-xs text-blue-200 hover:bg-blue-400/10 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => panel._id && deletePanel(panel._id)}
                          className="rounded-md border border-red-400/40 px-3 py-1 text-xs text-red-200 hover:bg-red-400/10 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Baterías</h2>
              <p className="text-xs text-gray-400">
                Define la capacidad y límites operativos de los bancos para sincronizar la simulación.
              </p>
            </div>
            <button
              onClick={resetBatteryForm}
              className="text-xs text-gray-300 border border-gray-700 rounded-md px-3 py-1 hover:bg-gray-800/80 transition-colors"
            >
              Nueva batería
            </button>
          </div>

          {batteryMessage && (
            <div
              className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                batteryMessage.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/40 bg-red-500/10 text-red-200'
              }`}
            >
              {batteryMessage.text}
            </div>
          )}

          <form onSubmit={handleBatterySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Nombre comercial *
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={batteryForm.name}
                  onChange={handleBatteryInput('name')}
                  required
                />
              </label>
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Fabricante
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={batteryForm.manufacturer}
                  onChange={handleBatteryInput('manufacturer')}
                />
              </label>
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Modelo
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={batteryForm.model}
                  onChange={handleBatteryInput('model')}
                />
              </label>
            </div>

            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Capacidad por módulo (kWh) *
              <input
                type="number"
                step="0.1"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.capacityKwh}
                onChange={handleBatteryInput('capacityKwh')}
                required
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Módulos instalados *
              <input
                type="number"
                min="1"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.quantity}
                onChange={handleBatteryInput('quantity')}
                required
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Profundidad descarga (%)
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.maxDepthOfDischargePercent}
                onChange={handleBatteryInput('maxDepthOfDischargePercent')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Potencia carga (kW)
              <input
                type="number"
                step="0.1"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.chargeRateKw}
                onChange={handleBatteryInput('chargeRateKw')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Potencia descarga (kW)
              <input
                type="number"
                step="0.1"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.dischargeRateKw}
                onChange={handleBatteryInput('dischargeRateKw')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Eficiencia (%)
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.efficiencyPercent}
                onChange={handleBatteryInput('efficiencyPercent')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Química
              <input
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.chemistry}
                onChange={handleBatteryInput('chemistry')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1">
              Voltaje nominal (V)
              <input
                type="number"
                step="0.1"
                min="0"
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                value={batteryForm.nominalVoltage}
                onChange={handleBatteryInput('nominalVoltage')}
              />
            </label>
            <label className="text-xs text-gray-400 flex flex-col gap-1 md:col-span-2">
              Observaciones
              <textarea
                className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none min-h-[80px]"
                value={batteryForm.notes}
                onChange={handleBatteryInput('notes')}
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-end gap-3">
              {isBatteryEditing && (
                <button
                  type="button"
                  onClick={resetBatteryForm}
                  className="rounded-md border border-gray-700 px-4 py-2 text-xs text-gray-300 hover:bg-gray-800/80 transition-colors"
                >
                  Cancelar edición
                </button>
              )}
              <button
                type="submit"
                disabled={batteryLoading}
                className="rounded-md border border-green-400/40 bg-green-400/10 px-5 py-2 text-sm font-semibold text-green-200 hover:bg-green-400/20 transition-colors disabled:opacity-60"
              >
                {batteryLoading
                  ? 'Guardando...'
                  : isBatteryEditing
                    ? 'Actualizar batería'
                    : 'Crear batería'}
              </button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Modelo</th>
                  <th className="px-3 py-2 text-left">Capacidad kWh</th>
                  <th className="px-3 py-2 text-left">Módulos</th>
                  <th className="px-3 py-2 text-left">Química</th>
                  <th className="px-3 py-2 text-left">Actualizado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {batteries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                      No hay baterías registradas todavía.
                    </td>
                  </tr>
                ) : (
                  batteries.map((battery) => (
                    <tr key={battery._id} className="border-b border-gray-900/70">
                      <td className="px-3 py-3">
                        <p className="font-medium text-white">{battery.name}</p>
                        {battery.manufacturer && (
                          <p className="text-xs text-gray-500">{battery.manufacturer}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-400">{battery.model ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        {battery.capacityKwh ? battery.capacityKwh.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-3">{battery.quantity ?? '—'}</td>
                      <td className="px-3 py-3">{battery.chemistry ?? '—'}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {battery.updatedAt
                          ? new Date(battery.updatedAt).toLocaleString('es-ES')
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-right space-x-2">
                        <button
                          onClick={() => editBattery(battery)}
                          className="rounded-md border border-blue-400/40 px-3 py-1 text-xs text-blue-200 hover:bg-blue-400/10 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => battery._id && deleteBattery(battery._id)}
                          className="rounded-md border border-red-400/40 px-3 py-1 text-xs text-red-200 hover:bg-red-400/10 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-lg shadow-black/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Apagones programados</h2>
              <p className="text-xs text-gray-400">
                Defina los cortes eléctricos diarios para ajustar las predicciones y alertas del sistema.
              </p>
            </div>
            <button
              onClick={resetBlackoutForm}
              className="text-xs text-gray-300 border border-gray-700 rounded-md px-3 py-1 hover:bg-gray-800/80 transition-colors"
            >
              Nuevo día
            </button>
          </div>

          {blackoutMessage && (
            <div
              className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                blackoutMessage.type === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/40 bg-red-500/10 text-red-200'
              }`}
            >
              {blackoutMessage.text}
            </div>
          )}

          <form onSubmit={handleBlackoutSubmit} className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Día del apagón *
                <input
                  type="date"
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={blackoutForm.date}
                  onChange={handleBlackoutInput('date')}
                  required
                />
              </label>
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Provincia
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={blackoutForm.province}
                  onChange={handleBlackoutInput('province')}
                />
              </label>
              <label className="text-xs text-gray-400 flex flex-col gap-1">
                Municipio / Zona
                <input
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                  value={blackoutForm.municipality}
                  onChange={handleBlackoutInput('municipality')}
                />
              </label>
              <label className="text-xs text-gray-400 flex flex-col gap-1 md:col-span-4">
                Observaciones
                <textarea
                  className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none min-h-[40px]"
                  value={blackoutForm.notes}
                  onChange={handleBlackoutInput('notes')}
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">Intervalos de corte</p>
                <button
                  type="button"
                  onClick={addIntervalRow}
                  className="text-xs text-green-300 border border-green-400/40 rounded-md px-3 py-1 hover:bg-green-400/20 transition-colors"
                >
                  Añadir intervalo
                </button>
              </div>
              <div className="space-y-3">
                {blackoutForm.intervals.map((interval) => (
                  <div
                    key={interval.id}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-3"
                  >
                    <label className="text-xs text-gray-400 flex flex-col gap-1">
                      Inicio *
                      <input
                        type="time"
                        className="rounded-md bg-gray-950 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                        value={interval.start}
                        onChange={handleIntervalChange(interval.id, 'start')}
                        required
                      />
                    </label>
                    <label className="text-xs text-gray-400 flex flex-col gap-1">
                      Fin *
                      <input
                        type="time"
                        className="rounded-md bg-gray-950 border border-gray-700 px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                        value={interval.end}
                        onChange={handleIntervalChange(interval.id, 'end')}
                        required
                      />
                    </label>
                    <div className="flex items-end justify-start sm:justify-end">
                      <button
                        type="button"
                        onClick={() => removeIntervalRow(interval.id)}
                        className="text-xs text-red-300 border border-red-400/40 rounded-md px-3 py-2 hover:bg-red-400/20 transition-colors disabled:opacity-40"
                        disabled={blackoutForm.intervals.length <= 1}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {isBlackoutEditing && (
                <button
                  type="button"
                  onClick={resetBlackoutForm}
                  className="rounded-md border border-gray-700 px-4 py-2 text-xs text-gray-300 hover:bg-gray-800/80 transition-colors"
                >
                  Cancelar edición
                </button>
              )}
              <button
                type="submit"
                disabled={blackoutLoading}
                className="rounded-md border border-green-400/40 bg-green-400/10 px-5 py-2 text-sm font-semibold text-green-200 hover:bg-green-400/20 transition-colors disabled:opacity-60"
              >
                {blackoutLoading
                  ? 'Guardando...'
                  : isBlackoutEditing
                    ? 'Actualizar apagón'
                    : 'Registrar apagón'}
              </button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Día</th>
                  <th className="px-3 py-2 text-left">Intervalos</th>
                  <th className="px-3 py-2 text-left">Zona</th>
                  <th className="px-3 py-2 text-left">Notas</th>
                  <th className="px-3 py-2 text-left">Actualizado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {blackouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                      No hay apagones registrados aún.
                    </td>
                  </tr>
                ) : (
                  blackouts.map((schedule) => (
                    <tr key={schedule._id ?? schedule.date} className="border-b border-gray-900/70">
                      <td className="px-3 py-3">
                        <p className="font-medium text-white">
                          {formatScheduleDate(schedule.date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(schedule.date).toISOString().split('T')[0]}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-300">
                        {schedule.intervals.length === 0
                          ? '—'
                          : schedule.intervals
                              .map(
                                (interval) =>
                                  `${formatScheduleTime(interval.start)} – ${formatScheduleTime(interval.end)}`
                              )
                              .join(' · ')}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">
                        {schedule.municipality ?? schedule.province ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">
                        {schedule.notes ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {schedule.updatedAt
                          ? new Date(schedule.updatedAt).toLocaleString('es-ES')
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-right space-x-2">
                        <button
                          onClick={() => editBlackout(schedule)}
                          className="rounded-md border border-blue-400/40 px-3 py-1 text-xs text-blue-200 hover:bg-blue-400/10 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            deleteBlackoutSchedule(new Date(schedule.date).toISOString().split('T')[0])
                          }
                          className="rounded-md border border-red-400/40 px-3 py-1 text-xs text-red-200 hover:bg-red-400/10 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
