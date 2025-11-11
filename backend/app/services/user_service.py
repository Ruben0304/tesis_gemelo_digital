"""
User registration/authentication service (passwords hashed with scrypt).
"""
from __future__ import annotations

import os
from datetime import datetime
from hashlib import scrypt
from secrets import compare_digest, token_bytes
from typing import Any, Dict, Optional

from pymongo.collection import Collection

from app.database import get_database

COLLECTION_NAME = "usuarios"
PASSWORD_KEY_LENGTH = 64
ALLOWED_ROLES = {"admin", "user"}
MIN_PASSWORD_LENGTH = 8


def _collection() -> Collection:
    return get_database()[COLLECTION_NAME]


def _map_user(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "_id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc.get("name"),
        "role": doc["role"],
        "createdAt": doc["createdAt"].isoformat() if doc.get("createdAt") else None,
        "updatedAt": doc["updatedAt"].isoformat() if doc.get("updatedAt") else None,
    }


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _ensure_role(role: Optional[str]) -> str:
    if not role:
        return "user"
    normalized = role.strip().lower()
    if normalized in ALLOWED_ROLES:
        return normalized
    raise ValueError(f"Rol no válido. Roles permitidos: {', '.join(ALLOWED_ROLES)}.")


def _ensure_password(password: Optional[str]) -> str:
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.")
    return password


def _hash_password(password: str) -> str:
    salt = token_bytes(16)
    derived = scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=PASSWORD_KEY_LENGTH,
    )
    return f"{salt.hex()}:{derived.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, hash_hex = stored_hash.split(":")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    stored = bytes.fromhex(hash_hex)
    derived = scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=len(stored),
    )
    return compare_digest(stored, derived)


def register_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not payload.get("email"):
        raise ValueError("El correo es obligatorio.")
    email = _normalize_email(payload["email"])
    password = _ensure_password(payload.get("password"))
    role = _ensure_role(payload.get("role"))

    if _collection().find_one({"email": email}):
        raise ValueError("Ya existe un usuario con ese correo.")

    now = datetime.utcnow()
    document = {
        "email": email,
        "name": payload.get("name") or None,
        "role": role,
        "passwordHash": _hash_password(password),
        "createdAt": now,
        "updatedAt": now,
    }
    result = _collection().insert_one(document)
    document["_id"] = result.inserted_id
    return _map_user(document)


def authenticate_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not payload.get("email") or not payload.get("password"):
        raise ValueError("Correo y contraseña son obligatorios.")
    email = _normalize_email(payload["email"])
    user = _collection().find_one({"email": email})
    if not user or not _verify_password(payload["password"], user["passwordHash"]):
        raise ValueError("Credenciales inválidas.")
    return _map_user(user)

