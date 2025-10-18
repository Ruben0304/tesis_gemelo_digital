import { ObjectId, WithId } from 'mongodb';
import { BatteryConfig } from '@/types';
import { getDb } from './db';

const COLLECTION_NAME = 'baterias';

type BatteryDocument = Omit<BatteryConfig, '_id' | 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

function mapBattery(doc: WithId<BatteryDocument>): BatteryConfig {
  return {
    _id: doc._id.toHexString(),
    name: doc.name,
    manufacturer: doc.manufacturer,
    model: doc.model,
    capacityKwh: doc.capacityKwh,
    quantity: doc.quantity,
    maxDepthOfDischargePercent: doc.maxDepthOfDischargePercent,
    chargeRateKw: doc.chargeRateKw,
    dischargeRateKw: doc.dischargeRateKw,
    efficiencyPercent: doc.efficiencyPercent,
    chemistry: doc.chemistry,
    nominalVoltage: doc.nominalVoltage,
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

function ensurePercent(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    throw new Error(`El campo ${field} debe ser un porcentaje entre 0 y 100.`);
  }
  return num;
}

export async function listBatteries(): Promise<BatteryConfig[]> {
  const db = await getDb();
  const collection = db.collection<BatteryDocument>(COLLECTION_NAME);
  const docs = await collection.find().sort({ updatedAt: -1 }).toArray();
  return docs.map(mapBattery);
}

export async function getBatteryById(id: string): Promise<BatteryConfig | null> {
  const db = await getDb();
  const collection = db.collection<BatteryDocument>(COLLECTION_NAME);
  const _id = new ObjectId(id);
  const doc = await collection.findOne({ _id });
  return doc ? mapBattery(doc) : null;
}

export async function createBattery(payload: Partial<BatteryConfig>): Promise<BatteryConfig> {
  if (!payload.name) {
    throw new Error('El campo name es obligatorio.');
  }

  const now = new Date();
  const document: BatteryDocument = {
    name: payload.name,
    manufacturer: payload.manufacturer,
    model: payload.model,
    capacityKwh: ensurePositive(payload.capacityKwh, 'capacityKwh'),
    quantity: ensurePositive(payload.quantity, 'quantity'),
    maxDepthOfDischargePercent: payload.maxDepthOfDischargePercent !== undefined
      ? ensurePercent(payload.maxDepthOfDischargePercent, 'maxDepthOfDischargePercent')
      : undefined,
    chargeRateKw: payload.chargeRateKw !== undefined
      ? ensurePositive(payload.chargeRateKw, 'chargeRateKw')
      : undefined,
    dischargeRateKw: payload.dischargeRateKw !== undefined
      ? ensurePositive(payload.dischargeRateKw, 'dischargeRateKw')
      : undefined,
    efficiencyPercent: payload.efficiencyPercent !== undefined
      ? ensurePercent(payload.efficiencyPercent, 'efficiencyPercent')
      : undefined,
    chemistry: payload.chemistry,
    nominalVoltage: payload.nominalVoltage !== undefined
      ? ensurePositive(payload.nominalVoltage, 'nominalVoltage')
      : undefined,
    notes: payload.notes,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  const collection = db.collection<BatteryDocument>(COLLECTION_NAME);
  const result = await collection.insertOne(document);

  return {
    ...payload,
    _id: result.insertedId.toHexString(),
    name: document.name,
    manufacturer: document.manufacturer,
    model: document.model,
    capacityKwh: document.capacityKwh,
    quantity: document.quantity,
    maxDepthOfDischargePercent: document.maxDepthOfDischargePercent,
    chargeRateKw: document.chargeRateKw,
    dischargeRateKw: document.dischargeRateKw,
    efficiencyPercent: document.efficiencyPercent,
    chemistry: document.chemistry,
    nominalVoltage: document.nominalVoltage,
    notes: document.notes,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function updateBattery(
  id: string,
  payload: Partial<BatteryConfig>
): Promise<BatteryConfig | null> {
  const db = await getDb();
  const collection = db.collection<BatteryDocument>(COLLECTION_NAME);
  const _id = new ObjectId(id);

  const existing = await collection.findOne({ _id });
  if (!existing) {
    return null;
  }

  const update: Partial<BatteryDocument> = {};

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.manufacturer !== undefined) update.manufacturer = payload.manufacturer;
  if (payload.model !== undefined) update.model = payload.model;
  if (payload.capacityKwh !== undefined) {
    update.capacityKwh = ensurePositive(payload.capacityKwh, 'capacityKwh');
  }
  if (payload.quantity !== undefined) {
    update.quantity = ensurePositive(payload.quantity, 'quantity');
  }
  if (payload.maxDepthOfDischargePercent !== undefined) {
    update.maxDepthOfDischargePercent = ensurePercent(payload.maxDepthOfDischargePercent, 'maxDepthOfDischargePercent');
  }
  if (payload.chargeRateKw !== undefined) {
    update.chargeRateKw = ensurePositive(payload.chargeRateKw, 'chargeRateKw');
  }
  if (payload.dischargeRateKw !== undefined) {
    update.dischargeRateKw = ensurePositive(payload.dischargeRateKw, 'dischargeRateKw');
  }
  if (payload.efficiencyPercent !== undefined) {
    update.efficiencyPercent = ensurePercent(payload.efficiencyPercent, 'efficiencyPercent');
  }
  if (payload.chemistry !== undefined) update.chemistry = payload.chemistry;
  if (payload.nominalVoltage !== undefined) {
    update.nominalVoltage = ensurePositive(payload.nominalVoltage, 'nominalVoltage');
  }
  if (payload.notes !== undefined) update.notes = payload.notes;

  update.updatedAt = new Date();

  await collection.updateOne({ _id }, { $set: update });
  const refreshed = await collection.findOne({ _id });

  return refreshed ? mapBattery(refreshed) : null;
}

export async function deleteBattery(id: string): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection<BatteryDocument>(COLLECTION_NAME);
  const _id = new ObjectId(id);
  const result = await collection.deleteOne({ _id });
  return result.deletedCount === 1;
}
