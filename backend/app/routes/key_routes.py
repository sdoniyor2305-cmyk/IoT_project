"""
Key Generation and Management Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import uuid

from app.models.models import CryptographicKey, User, IoTDevice
from app.schemas.schemas import (
    KeyGenerationRequest, CryptographicKeyResponse, CryptographicKeyDetailResponse,
    CryptographicKeyListResponse
)
from app.auth.auth import get_current_user
from app.utils.database import get_db, log_action
from crypto.keygen import KeyGenerator
from crypto.analysis import EntropyAnalyzer

router = APIRouter(prefix="/keys", tags=["Cryptographic Keys"])


@router.post("/generate", response_model=CryptographicKeyDetailResponse)
def generate_key(
    request: KeyGenerationRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))

    if request.device_id:
        device = db.query(IoTDevice).filter(
            IoTDevice.id == request.device_id,
            IoTDevice.user_id == user_id
        ).first()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    device_identifier = f"IoT_Device_{user_id}_{uuid.uuid4().hex[:8]}"
    keygen = KeyGenerator(device_identifier)
    key_length_bytes = request.key_length_bits // 8

    if request.generation_method == "drbg":
        key_value = keygen.generate_random_key(key_length_bytes)
    elif request.generation_method == "trng":
        key_value = keygen.generate_trng_key(key_length_bytes)
    elif request.generation_method == "puf":
        key_value = keygen.generate_puf_key(b'', key_length_bytes)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid generation method")

    entropy_analysis = EntropyAnalyzer.comprehensive_analysis(key_value)
    shannon_entropy = entropy_analysis.get('shannon_entropy', 0)
    randomness_score = min(100, (shannon_entropy / 8) * 100)

    key_id = str(uuid.uuid4())
    new_key = CryptographicKey(
        key_id=key_id,
        key_value=key_value.hex(),
        key_length_bits=request.key_length_bits,
        generation_method=request.generation_method,
        algorithm_used='N/A',
        shannon_entropy=entropy_analysis.get('shannon_entropy'),
        min_entropy=entropy_analysis.get('min_entropy'),
        collision_entropy=entropy_analysis.get('collision_entropy'),
        randomness_score=randomness_score,
        user_id=user_id,
        device_id=request.device_id
    )

    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    log_action(db, user_id, current_user.get("username"), "KEY_GENERATED", "key", new_key.key_id,
               f"{request.key_length_bits}-bit via {request.generation_method}")
    return new_key


@router.get("", response_model=List[CryptographicKeyListResponse])
def list_keys(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))
    keys = db.query(CryptographicKey).filter(CryptographicKey.user_id == user_id).all()

    result = []
    for k in keys:
        device_name = None
        device_type = None
        if k.device:
            device_name = k.device.device_name
            device_type = k.device.device_type
        result.append(CryptographicKeyListResponse(
            id=k.id,
            key_id=k.key_id,
            key_length_bits=k.key_length_bits,
            generation_method=k.generation_method,
            is_active=k.is_active,
            randomness_score=k.randomness_score,
            created_at=k.created_at,
            bound_protocol=k.bound_protocol,
            device_id=k.device_id,
            device_name=device_name,
            device_type=device_type,
            shannon_entropy=k.shannon_entropy,
        ))
    return result


@router.get("/{key_id}", response_model=CryptographicKeyDetailResponse)
def get_key(
    key_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))
    key = db.query(CryptographicKey).filter(
        CryptographicKey.id == key_id,
        CryptographicKey.user_id == user_id
    ).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")
    return key


@router.delete("/{key_id}")
def delete_key(
    key_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))
    key = db.query(CryptographicKey).filter(
        CryptographicKey.id == key_id,
        CryptographicKey.user_id == user_id
    ).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")

    key_label = key.key_id
    db.delete(key)
    db.commit()

    log_action(db, user_id, current_user.get("username"), "KEY_DELETED", "key", key_label)
    return {"message": "Key deleted successfully"}


@router.post("/{key_id}/export")
def export_key(
    key_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))
    key = db.query(CryptographicKey).filter(
        CryptographicKey.id == key_id,
        CryptographicKey.user_id == user_id
    ).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")

    key.is_exported = True
    key.export_count = (key.export_count or 0) + 1
    db.commit()

    return {
        "key_id": key.key_id,
        "key_value": key.key_value,
        "key_length_bits": key.key_length_bits,
        "generation_method": key.generation_method,
    }


@router.get("/{key_id}/entropy")
def get_key_entropy(
    key_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user.get("sub"))
    key = db.query(CryptographicKey).filter(
        CryptographicKey.id == key_id,
        CryptographicKey.user_id == user_id
    ).first()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")

    return {
        "key_id": key.key_id,
        "shannon_entropy": key.shannon_entropy,
        "min_entropy": key.min_entropy,
        "collision_entropy": key.collision_entropy,
        "randomness_score": key.randomness_score
    }
