"""
IoT Device Management Routes
Purpose: Device creation, listing, updating, and status monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

from app.models.models import IoTDevice, User, CryptographicKey
from app.schemas.schemas import (
    IoTDeviceCreateRequest, IoTDeviceResponse, IoTDeviceDetailResponse,
    DeviceStatusUpdateRequest, DeviceBindKeyRequest, DeviceBindKeyResponse
)
from app.auth.auth import get_current_user
from app.utils.database import get_db, log_action
from crypto.keygen import KeyGenerator
from crypto.analysis import EntropyAnalyzer

router = APIRouter(prefix="/devices", tags=["IoT Devices"])


@router.post("", response_model=IoTDeviceResponse)
def create_device(
    request: IoTDeviceCreateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create new IoT device
    
    Args:
        request: Device creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created device data
    """
    user_id = int(current_user.get("sub"))
    
    # Check if device_id already exists
    existing_device = db.query(IoTDevice).filter(
        IoTDevice.device_id == request.device_id
    ).first()
    
    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device ID already exists"
        )
    
    # Create new device
    new_device = IoTDevice(
        device_id=request.device_id,
        device_name=request.device_name,
        device_type=request.device_type,
        manufacturer=request.manufacturer,
        model=request.model,
        description=request.description,
        cpu_type=request.cpu_type,
        memory_kb=request.memory_kb,
        storage_kb=request.storage_kb,
        user_id=user_id,
        status="offline"
    )
    
    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    log_action(db, user_id, current_user.get("username"), "DEVICE_CREATED", "device",
               new_device.device_id, f"{request.device_type}: {request.device_name}")
    return new_device


@router.get("", response_model=List[IoTDeviceResponse])
def list_devices(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all devices for current user
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of devices
    """
    user_id = int(current_user.get("sub"))
    
    devices = db.query(IoTDevice).filter(IoTDevice.user_id == user_id).all()
    
    return devices


@router.get("/{device_id}", response_model=IoTDeviceDetailResponse)
def get_device(
    device_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get device details
    
    Args:
        device_id: Device ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Device details
    """
    user_id = int(current_user.get("sub"))
    
    device = db.query(IoTDevice).filter(
        IoTDevice.id == device_id,
        IoTDevice.user_id == user_id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return device


@router.put("/{device_id}", response_model=IoTDeviceDetailResponse)
def update_device(
    device_id: int,
    request: IoTDeviceCreateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update device information
    
    Args:
        device_id: Device ID
        request: Updated device data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated device data
    """
    user_id = int(current_user.get("sub"))
    
    device = db.query(IoTDevice).filter(
        IoTDevice.id == device_id,
        IoTDevice.user_id == user_id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Update fields
    device.device_name = request.device_name
    device.device_type = request.device_type
    device.manufacturer = request.manufacturer
    device.model = request.model
    device.description = request.description
    device.cpu_type = request.cpu_type
    device.memory_kb = request.memory_kb
    device.storage_kb = request.storage_kb
    device.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(device)
    
    return device


@router.delete("/{device_id}")
def delete_device(
    device_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete device
    
    Args:
        device_id: Device ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Deletion confirmation
    """
    user_id = int(current_user.get("sub"))
    
    device = db.query(IoTDevice).filter(
        IoTDevice.id == device_id,
        IoTDevice.user_id == user_id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device_label = device.device_id
    db.delete(device)
    db.commit()

    log_action(db, user_id, current_user.get("username"), "DEVICE_DELETED", "device", device_label)
    return {"message": "Device deleted successfully"}


@router.post("/{device_id}/status")
def update_device_status(
    device_id: int,
    request: DeviceStatusUpdateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update device status (online/offline)

    Args:
        device_id: Device ID
        request: Status update request body with status field
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated device status
    """
    user_id = int(current_user.get("sub"))

    if request.status not in ["online", "offline", "error"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status value"
        )

    device = db.query(IoTDevice).filter(
        IoTDevice.id == device_id,
        IoTDevice.user_id == user_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    device.status = request.status
    device.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(device)

    return {"device_id": device.id, "status": device.status}


def _generate_and_bind(device, protocol, generation_method, key_length_bits, algorithm, user_id, db):
    """Helper: generate a new key and bind it to the device."""
    # Deactivate existing bound key
    if device.bound_key_id:
        old_key = db.query(CryptographicKey).filter(CryptographicKey.id == device.bound_key_id).first()
        if old_key:
            old_key.is_active = False
            old_key.bound_protocol = None

    device_identifier = f"IoT_{device.device_id}_{uuid.uuid4().hex[:8]}"
    keygen = KeyGenerator(device_identifier)
    key_bytes_len = key_length_bits // 8

    if generation_method == "drbg":
        key_bytes = keygen.generate_random_key(key_bytes_len)
    elif generation_method == "trng":
        key_bytes = keygen.generate_trng_key(key_bytes_len)
    else:
        key_bytes = keygen.generate_puf_key(b'', key_bytes_len)

    entropy = EntropyAnalyzer.comprehensive_analysis(key_bytes)
    randomness_score = min(100.0, (entropy.get('shannon_entropy', 0) / 8.0) * 100.0)

    new_key = CryptographicKey(
        key_id=str(uuid.uuid4()),
        key_value=key_bytes.hex(),
        key_length_bits=key_length_bits,
        generation_method=generation_method,
        algorithm_used=algorithm,
        shannon_entropy=entropy.get('shannon_entropy'),
        min_entropy=entropy.get('min_entropy'),
        collision_entropy=entropy.get('collision_entropy'),
        randomness_score=randomness_score,
        user_id=user_id,
        device_id=device.id,
        bound_protocol=protocol,
    )
    db.add(new_key)
    db.flush()

    device.protocol = protocol
    device.is_secured = True
    device.bound_key_id = new_key.id
    db.commit()
    db.refresh(new_key)
    return new_key, randomness_score


@router.post("/{device_id}/bind-key", response_model=DeviceBindKeyResponse)
def bind_key(
    device_id: int,
    request: DeviceBindKeyRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a new key and bind it to the device with the selected protocol."""
    user_id = int(current_user.get("sub"))

    device = db.query(IoTDevice).filter(
        IoTDevice.id == device_id, IoTDevice.user_id == user_id
    ).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    new_key, score = _generate_and_bind(
        device, request.protocol, request.generation_method,
        request.key_length_bits, request.algorithm, user_id, db
    )

    log_action(db, user_id, current_user.get("username"), "KEY_BOUND", "device",
               device.device_id, f"Protocol:{request.protocol} Method:{request.generation_method}")

    return DeviceBindKeyResponse(
        device_id=device.id,
        device_name=device.device_name,
        protocol=request.protocol,
        is_secured=True,
        key_id=new_key.id,
        key_hex=new_key.key_value,
        key_length_bits=new_key.key_length_bits,
        generation_method=new_key.generation_method,
        algorithm=new_key.algorithm_used,
        randomness_score=score,
    )


@router.post("/{device_id}/rotate-key", response_model=DeviceBindKeyResponse)
def rotate_key(
    device_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rotate the bound key on a device using the same settings."""
    user_id = int(current_user.get("sub"))

    device = db.query(IoTDevice).filter(
        IoTDevice.id == device_id, IoTDevice.user_id == user_id
    ).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    if not device.is_secured or not device.bound_key_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Device has no bound key to rotate")

    old_key = db.query(CryptographicKey).filter(CryptographicKey.id == device.bound_key_id).first()
    if not old_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bound key not found")

    new_key, score = _generate_and_bind(
        device, device.protocol, old_key.generation_method,
        old_key.key_length_bits, old_key.algorithm_used, user_id, db
    )

    log_action(db, user_id, current_user.get("username"), "KEY_ROTATED", "device",
               device.device_id, f"Protocol:{device.protocol}")

    return DeviceBindKeyResponse(
        device_id=device.id,
        device_name=device.device_name,
        protocol=device.protocol,
        is_secured=True,
        key_id=new_key.id,
        key_hex=new_key.key_value,
        key_length_bits=new_key.key_length_bits,
        generation_method=new_key.generation_method,
        algorithm=new_key.algorithm_used,
        randomness_score=score,
    )
