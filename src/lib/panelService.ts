import { ObjectId, WithId } from 'mongodb';
import { SolarPanelConfig } from '@/types';
import { getDb } from './db';

const COLLECTION_NAME = 'paneles';

type SolarPanelDocument = Omit<SolarPanelConfig, '_id' | 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

function mapPanel(doc: WithId<SolarPanelDocument>): SolarPanelConfig {
  return {
    _id: doc._id.toHexString(),
    name: doc.name,
    manufacturer: doc.manufacturer,
    model: doc.model,
    ratedPowerKw: doc.ratedPowerKw,
    quantity: doc.quantity,
    strings: doc.strings,
    efficiencyPercent: doc.efficiencyPercent,
    areaM2: doc.areaM2,
    tiltDegrees: doc.tiltDegrees,
    orientation: doc.orientation,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function ensurePositive(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`El campo ${field} debe ser un número mayor que cero.`);
  }
  return num;
}

function ensureNonNegative(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`El campo ${field} debe ser un número mayor o igual que cero.`);
  }
  return num;
}

export async function listPanels(): Promise<SolarPanelConfig[]> {
  const db = await getDb();
  const collection = db.collection<SolarPanelDocument>(COLLECTION_NAME);
  const docs = await collection.find().sort({ updatedAt: -1 }).toArray();
  return docs.map(mapPanel);
}

export async function getPanelById(id: string): Promise<SolarPanelConfig | null> {
  const db = await getDb();
  const collection = db.collection<SolarPanelDocument>(COLLECTION_NAME);
  const _id = new ObjectId(id);
  const doc = await collection.findOne({ _id });
  return doc ? mapPanel(doc) : null;
}

export async function createPanel(payload: Partial<SolarPanelConfig>): Promise<SolarPanelConfig> {
  if (!payload.name) {
    throw new Error('El campo name es obligatorio.');
  }

  const now = new Date();
  const document: SolarPanelDocument = {
    name: payload.name,
    manufacturer: payload.manufacturer,
    model: payload.model,
    ratedPowerKw: ensurePositive(payload.ratedPowerKw, 'ratedPowerKw'),
    quantity: ensurePositive(payload.quantity, 'quantity'),
    strings: ensurePositive(payload.strings, 'strings'),
    efficiencyPercent: payload.efficiencyPercent !== undefined
      ? ensurePositive(payload.efficiencyPercent, 'efficiencyPercent')
      : undefined,
    areaM2: payload.areaM2 !== undefined
      ? ensurePositive(payload.areaM2, 'areaM2')
      : undefined,
    tiltDegrees: payload.tiltDegrees !== undefined
      ? ensureNonNegative(payload.tiltDegrees, 'tiltDegrees')
      : undefined,
    orientation: payload.orientation,
    notes: payload.notes,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  const collection = db.collection<SolarPanelDocument>(COLLECTION_NAME);
  const result = await collection.insertOne(document);

  return {
    ...payload,
    _id: result.insertedId.toHexString(),
    name: document.name,
    manufacturer: document.manufacturer,
    model: document.model,
    ratedPowerKw: document.ratedPowerKw,
    quantity: document.quantity,
    strings: document.strings,
    efficiencyPercent: document.efficiencyPercent,
    areaM2: document.areaM2,
    tiltDegrees: document.tiltDegrees,
    orientation: document.orientation,
    notes: document.notes,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function updatePanel(
  id: string,
  payload: Partial<SolarPanelConfig>
): Promise<SolarPanelConfig | null> {
  const db = await getDb();
  const collection = db.collection<SolarPanelDocument>(COLLECTION_NAME);
  const _id = new ObjectId(id);

  const existing = await collection.findOne({ _id });
  if (!existing) {
    return null;
  }

  const update: Partial<SolarPanelDocument> = {};

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.manufacturer !== undefined) update.manufacturer = payload.manufacturer;
  if (payload.model !== undefined) update.model = payload.model;
  if (payload.ratedPowerKw !== undefined) {
    update.ratedPowerKw = ensurePositive(payload.ratedPowerKw, 'ratedPowerKw');
  }
  if (payload.quantity !== undefined) {
    update.quantity = ensurePositive(payload.quantity, 'quantity');
  }
  if (payload.strings !== undefined) {
    update.strings = ensurePositive(payload.strings, 'strings');
  }
  if (payload.efficiencyPercent !== undefined) {
    update.efficiencyPercent = ensurePositive(payload.efficiencyPercent, 'efficiencyPercent');
  }
  if (payload.areaM2 !== undefined) {
    update.areaM2 = ensurePositive(payload.areaM2, 'areaM2');
  }
  if (payload.tiltDegrees !== undefined) {
    update.tiltDegrees = ensureNonNegative(payload.tiltDegrees, 'tiltDegrees');
  }
  if (payload.orientation !== undefined) update.orientation = payload.orientation;
  if (payload.notes !== undefined) update.notes = payload.notes;

  update.updatedAt = new Date();

  await collection.updateOne({ _id }, { $set: update });
  const refreshed = await collection.findOne({ _id });

  return refreshed ? mapPanel(refreshed) : null;
}

export async function deletePanel(id: string): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection<SolarPanelDocument>(COLLECTION_NAME);
  const _id = new ObjectId(id);
  const result = await collection.deleteOne({ _id });
  return result.deletedCount === 1;
}
