"""
IoT Communication Simulation Routes
Purpose: Simulate device-to-device secure communication via MQTT, CoAP, TLS
"""

import random
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.models.models import Communication, CryptographicKey, IoTDevice
from app.schemas.schemas import CommunicationSimulateRequest
from app.utils.database import get_db, log_action

router = APIRouter(prefix="/communication", tags=["Communication"])

# Simulated base latency (ms) per protocol
PROTOCOL_LATENCY = {
    "mqtt": (8.0, 15.0),
    "coap": (4.0, 10.0),
    "tls":  (25.0, 45.0),
}


def _xor_cipher(key_bytes: bytes, data: bytes) -> bytes:
    """XOR stream cipher using repeating key — symmetric encrypt/decrypt."""
    if not key_bytes:
        return data
    return bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data))


@router.post("/simulate")
def simulate_communication(
    request: CommunicationSimulateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simulate key-secured IoT device-to-device communication."""
    user_id = int(current_user.get("sub"))

    source_device = db.query(IoTDevice).filter(
        IoTDevice.id == request.source_device_id,
        IoTDevice.user_id == user_id,
    ).first()
    if not source_device:
        raise HTTPException(status_code=404, detail="Source device not found")
    if not source_device.is_secured or not source_device.bound_key_id:
        raise HTTPException(status_code=400,
                            detail="Source device has no bound key. Please bind a key first.")

    target_device = db.query(IoTDevice).filter(
        IoTDevice.id == request.target_device_id,
        IoTDevice.user_id == user_id,
    ).first()
    if not target_device:
        raise HTTPException(status_code=404, detail="Target device not found")

    if request.source_device_id == request.target_device_id:
        raise HTTPException(status_code=400, detail="Source and target devices must differ")

    src_key = db.query(CryptographicKey).filter(
        CryptographicKey.id == source_device.bound_key_id
    ).first()
    if not src_key:
        raise HTTPException(status_code=400, detail="Source device key record not found")

    key_bytes = bytes.fromhex(src_key.key_value)
    message_bytes = request.message.encode("utf-8")

    t0 = time.perf_counter()
    ciphertext = _xor_cipher(key_bytes, message_bytes)
    enc_time = (time.perf_counter() - t0) * 1000

    lat_min, lat_max = PROTOCOL_LATENCY.get(source_device.protocol or "mqtt", (8.0, 15.0))
    transmission_time = round(random.uniform(lat_min, lat_max), 3)

    t1 = time.perf_counter()
    plaintext = _xor_cipher(key_bytes, ciphertext)
    dec_time = (time.perf_counter() - t1) * 1000

    try:
        decrypted_message = plaintext.decode("utf-8")
    except Exception:
        decrypted_message = request.message

    comm_id = str(uuid.uuid4())
    comm = Communication(
        comm_id=comm_id,
        source_device_id=source_device.id,
        target_device_id=target_device.id,
        protocol=source_device.protocol or "mqtt",
        algorithm='N/A',
        encrypted_message=ciphertext.hex(),
        original_message=request.message,
        transmission_time_ms=transmission_time,
        encryption_time_ms=round(enc_time, 3),
        decryption_time_ms=round(dec_time, 3),
        key_method=src_key.generation_method,
        key_length_bits=src_key.key_length_bits,
        status="success",
        user_id=user_id,
    )
    db.add(comm)
    db.commit()

    log_action(db, user_id, current_user.get("username"), "COMM_SIMULATED", "communication",
               comm_id, f"{source_device.device_name} -> {target_device.device_name} via {source_device.protocol}")

    total = round(enc_time + transmission_time + dec_time, 3)
    return {
        "source_device_name": source_device.device_name,
        "target_device_name": target_device.device_name,
        "source_device_type": source_device.device_type,
        "target_device_type": target_device.device_type,
        "protocol": source_device.protocol or "mqtt",
        "original_message": request.message,
        "encrypted_message": ciphertext.hex(),
        "decrypted_message": decrypted_message,
        "key_method": src_key.generation_method,
        "key_length_bits": src_key.key_length_bits,
        "transmission_time_ms": transmission_time,
        "encryption_time_ms": round(enc_time, 3),
        "decryption_time_ms": round(dec_time, 3),
        "total_time_ms": total,
        "status": "success",
        "comm_id": comm_id,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/history")
def get_communication_history(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the last 50 communication simulations for the current user."""
    user_id = int(current_user.get("sub"))

    comms = (
        db.query(Communication)
        .filter(Communication.user_id == user_id)
        .order_by(Communication.created_at.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": c.id,
            "comm_id": c.comm_id,
            "source_device_name": c.source_device.device_name if c.source_device else "Unknown",
            "target_device_name": c.target_device.device_name if c.target_device else "Unknown",
            "protocol": c.protocol,
            "key_method": c.key_method,
            "key_length_bits": c.key_length_bits,
            "transmission_time_ms": c.transmission_time_ms,
            "encryption_time_ms": c.encryption_time_ms,
            "decryption_time_ms": c.decryption_time_ms,
            "status": c.status,
            "created_at": c.created_at.isoformat(),
        }
        for c in comms
    ]
