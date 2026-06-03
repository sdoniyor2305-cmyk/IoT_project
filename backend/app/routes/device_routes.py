"""
IoT Device Management Routes
Purpose: Device creation, listing, updating, and status monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.models.models import IoTDevice, User
from app.schemas.schemas import IoTDeviceCreateRequest, IoTDeviceResponse, IoTDeviceDetailResponse, DeviceStatusUpdateRequest
from app.auth.auth import get_current_user
from app.utils.database import get_db, log_action

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
