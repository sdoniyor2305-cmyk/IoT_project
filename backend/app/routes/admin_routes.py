"""
Admin Routes
Purpose: Super-admin endpoints for user management, system stats, and audit logs.
All routes require is_admin=True in the JWT token.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.models import User, IoTDevice, CryptographicKey, Operation, AuditLog
from app.schemas.schemas import (
    AdminStatsResponse, AuditLogResponse,
    AdminUserResponse, AdminDeviceResponse, AdminKeyResponse, AdminOperationResponse,
)
from app.auth.auth import get_current_admin_user
from app.utils.database import get_db, log_action

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _admin_username(current_user) -> str:
    return current_user.get("username", "admin")

def _admin_id(current_user) -> int:
    return int(current_user.get("sub", 0))


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """System-wide statistics."""
    return AdminStatsResponse(
        total_users=db.query(User).count(),
        active_users=db.query(User).filter(User.is_active == True).count(),
        total_devices=db.query(IoTDevice).count(),
        online_devices=db.query(IoTDevice).filter(IoTDevice.status == "online").count(),
        total_keys=db.query(CryptographicKey).count(),
        total_operations=db.query(Operation).count(),
        total_encrypt=db.query(Operation).filter(Operation.operation_type == "encrypt").count(),
        total_decrypt=db.query(Operation).filter(Operation.operation_type == "decrypt").count(),
    )


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse])
def list_all_users(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """List every registered user with device/key counts."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        result.append(AdminUserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            is_admin=u.is_admin,
            role=getattr(u, 'role', 'user') or 'user',
            created_at=u.created_at,
            device_count=db.query(IoTDevice).filter(IoTDevice.user_id == u.id).count(),
            key_count=db.query(CryptographicKey).filter(CryptographicKey.user_id == u.id).count(),
        ))
    return result


@router.put("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Activate a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.username == "superadmin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify superadmin")

    user.is_active = True
    db.commit()
    log_action(db, _admin_id(current_user), _admin_username(current_user),
               "USER_ACTIVATED", "user", str(user_id), f"Activated user: {user.username}")
    return {"message": f"User {user.username} activated"}


@router.put("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Deactivate (disable) a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.username == "superadmin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify superadmin")

    user.is_active = False
    db.commit()
    log_action(db, _admin_id(current_user), _admin_username(current_user),
               "USER_DEACTIVATED", "user", str(user_id), f"Deactivated user: {user.username}")
    return {"message": f"User {user.username} deactivated"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Permanently delete a user and all their data."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.username == "superadmin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete superadmin")
    if user.id == _admin_id(current_user):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")

    deleted_username = user.username
    log_action(db, _admin_id(current_user), _admin_username(current_user),
               "USER_DELETED", "user", str(user_id), f"Deleted user: {deleted_username}")

    # Delete related records before deleting user (SQLite doesn't enforce FK cascades by default)
    db.query(Operation).filter(Operation.user_id == user_id).delete()
    db.query(CryptographicKey).filter(CryptographicKey.user_id == user_id).delete()
    db.query(IoTDevice).filter(IoTDevice.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    return {"message": f"User {deleted_username} and all their data deleted"}


# ── Devices ───────────────────────────────────────────────────────────────────

@router.get("/devices", response_model=List[AdminDeviceResponse])
def list_all_devices(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """List every device across all users."""
    devices = db.query(IoTDevice).order_by(IoTDevice.created_at.desc()).all()
    result = []
    for d in devices:
        owner = db.query(User).filter(User.id == d.user_id).first()
        result.append(AdminDeviceResponse(
            id=d.id,
            device_id=d.device_id,
            device_name=d.device_name,
            device_type=d.device_type,
            status=d.status,
            memory_kb=d.memory_kb,
            owner_username=owner.username if owner else "unknown",
            created_at=d.created_at,
        ))
    return result


# ── Keys ──────────────────────────────────────────────────────────────────────

@router.get("/keys", response_model=List[AdminKeyResponse])
def list_all_keys(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """List every cryptographic key across all users."""
    keys = db.query(CryptographicKey).order_by(CryptographicKey.created_at.desc()).all()
    result = []
    for k in keys:
        owner = db.query(User).filter(User.id == k.user_id).first()
        result.append(AdminKeyResponse(
            id=k.id,
            key_id=k.key_id,
            key_length_bits=k.key_length_bits,
            generation_method=k.generation_method,
            randomness_score=k.randomness_score,
            owner_username=owner.username if owner else "unknown",
            created_at=k.created_at,
        ))
    return result


# ── Operations ────────────────────────────────────────────────────────────────

@router.get("/operations", response_model=List[AdminOperationResponse])
def list_all_operations(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """List every encrypt/decrypt operation across all users."""
    ops = db.query(Operation).order_by(Operation.created_at.desc()).limit(200).all()
    result = []
    for o in ops:
        owner = db.query(User).filter(User.id == o.user_id).first()
        result.append(AdminOperationResponse(
            id=o.id,
            operation_id=o.operation_id,
            operation_type=o.operation_type,
            algorithm=o.algorithm,
            execution_time_ms=o.execution_time_ms,
            status=o.status,
            owner_username=owner.username if owner else "unknown",
            created_at=o.created_at,
        ))
    return result


# ── Audit Logs ────────────────────────────────────────────────────────────────

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Return the 200 most recent audit log entries."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return logs
