"""
Battery bank CRUD helpers backed by MongoDB.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo.collection import Collection

from app.database import get_database

COLLECTION_NAME = "baterias"


def _collection() -> Collection:
    return get_database()[COLLECTION_NAME]


def _ensure_positive(value: Any, field: str) -> float:
    if value is None:
        raise ValueError(f"El campo {field} es obligatorio.")
    number = float(value)
    if number <= 0:
        raise ValueError(f"El campo {field} debe ser un número mayor que cero.")
    return number


def _ensure_percent(value: Any, field: str) -> float:
    if value is None:
        raise ValueError(f"El campo {field} es obligatorio.")
    number = float(value)
    if number < 0 or number > 100:
        raise ValueError(f"El campo {field} debe ser un porcentaje entre 0 y 100.")
    return number


def _object_id(battery_id: str) -> ObjectId:
    try:
        return ObjectId(battery_id)
    except Exception as exc:  # pragma: no cover
        raise ValueError("Identificador de batería inválido.") from exc


def _map_battery(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "_id": str(doc["_id"]),
        "name": doc.get("name"),
        "manufacturer": doc.get("manufacturer"),
        "model": doc.get("model"),
        "capacityKwh": doc.get("capacityKwh"),
        "quantity": doc.get("quantity"),
        "maxDepthOfDischargePercent": doc.get("maxDepthOfDischargePercent"),
        "chargeRateKw": doc.get("chargeRateKw"),
        "dischargeRateKw": doc.get("dischargeRateKw"),
        "efficiencyPercent": doc.get("efficiencyPercent"),
        "chemistry": doc.get("chemistry"),
        "nominalVoltage": doc.get("nominalVoltage"),
        "notes": doc.get("notes"),
        "createdAt": doc.get("createdAt").isoformat() if doc.get("createdAt") else None,
        "updatedAt": doc.get("updatedAt").isoformat() if doc.get("updatedAt") else None,
    }


def list_batteries() -> List[Dict[str, Any]]:
    cursor = _collection().find().sort("updatedAt", -1)
    return [_map_battery(doc) for doc in cursor]


def get_battery(battery_id: str) -> Optional[Dict[str, Any]]:
    doc = _collection().find_one({"_id": _object_id(battery_id)})
    return _map_battery(doc) if doc else None


def create_battery(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not payload.get("name"):
        raise ValueError("El campo name es obligatorio.")

    now = datetime.utcnow()
    document: Dict[str, Any] = {
        "name": payload.get("name"),
        "manufacturer": payload.get("manufacturer"),
        "model": payload.get("model"),
        "capacityKwh": _ensure_positive(payload.get("capacityKwh"), "capacityKwh"),
        "quantity": _ensure_positive(payload.get("quantity"), "quantity"),
        "maxDepthOfDischargePercent": (
            _ensure_percent(payload.get("maxDepthOfDischargePercent"), "maxDepthOfDischargePercent")
            if payload.get("maxDepthOfDischargePercent") is not None
            else None
        ),
        "chargeRateKw": (
            _ensure_positive(payload.get("chargeRateKw"), "chargeRateKw")
            if payload.get("chargeRateKw") is not None
            else None
        ),
        "dischargeRateKw": (
            _ensure_positive(payload.get("dischargeRateKw"), "dischargeRateKw")
            if payload.get("dischargeRateKw") is not None
            else None
        ),
        "efficiencyPercent": (
            _ensure_percent(payload.get("efficiencyPercent"), "efficiencyPercent")
            if payload.get("efficiencyPercent") is not None
            else None
        ),
        "chemistry": payload.get("chemistry"),
        "nominalVoltage": (
            _ensure_positive(payload.get("nominalVoltage"), "nominalVoltage")
            if payload.get("nominalVoltage") is not None
            else None
        ),
        "notes": payload.get("notes"),
        "createdAt": now,
        "updatedAt": now,
    }
    result = _collection().insert_one(document)
    document["_id"] = result.inserted_id
    return _map_battery(document)


def update_battery(battery_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    update: Dict[str, Any] = {}

    for field in ["name", "manufacturer", "model", "chemistry", "notes"]:
        if field in payload:
            update[field] = payload.get(field)

    numeric_fields = {
        "capacityKwh": _ensure_positive,
        "quantity": _ensure_positive,
        "chargeRateKw": _ensure_positive,
        "dischargeRateKw": _ensure_positive,
        "nominalVoltage": _ensure_positive,
    }
    percent_fields = {
        "maxDepthOfDischargePercent": _ensure_percent,
        "efficiencyPercent": _ensure_percent,
    }

    for field, validator in numeric_fields.items():
        if field in payload and payload[field] is not None:
            update[field] = validator(payload[field], field)

    for field, validator in percent_fields.items():
        if field in payload and payload[field] is not None:
            update[field] = validator(payload[field], field)

    if not update:
        return get_battery(battery_id)

    update["updatedAt"] = datetime.utcnow()
    result = _collection().find_one_and_update(
        {"_id": _object_id(battery_id)},
        {"$set": update},
        return_document=True,
    )
    return _map_battery(result) if result else None


def delete_battery(battery_id: str) -> bool:
    result = _collection().delete_one({"_id": _object_id(battery_id)})
    return result.deleted_count == 1

