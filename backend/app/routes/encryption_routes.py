"""
Encryption and Decryption Routes
Purpose: Encrypt, decrypt, and analyze encrypted data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import time
import uuid

from app.models.models import CryptographicKey, Operation
from app.schemas.schemas import (
    EncryptionRequest, EncryptionResponse,
    DecryptionRequest, DecryptionResponse,
    OperationResponse, OperationDetailResponse
)
from app.auth.auth import get_current_user
from app.utils.database import get_db

from crypto.aes import aes_encrypt, aes_decrypt
from crypto.ascon import ascon_encrypt, ascon_decrypt
from crypto.speck import speck_encrypt, speck_decrypt

router = APIRouter(prefix="/crypto", tags=["Encryption"])


def _get_key_bytes(key_id: Optional[int], key_hex: Optional[str],
                  current_user, db: Session) -> bytes:
    """Helper to get key bytes"""
    user_id = int(current_user.get("sub"))
    
    if key_id:
        key_record = db.query(CryptographicKey).filter(
            CryptographicKey.id == key_id,
            CryptographicKey.user_id == user_id
        ).first()
        
        if not key_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Key not found"
            )
        
        return bytes.fromhex(key_record.key_value)
    elif key_hex:
        try:
            return bytes.fromhex(key_hex)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid hex key format"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either key_id or key must be provided"
        )


@router.post("/encrypt", response_model=EncryptionResponse)
def encrypt_data(
    request: EncryptionRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Encrypt data
    
    Args:
        request: Encryption request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Encrypted data and metrics
    """
    user_id = int(current_user.get("sub"))
    
    try:
        # Get key
        key = _get_key_bytes(request.key_id, request.key, current_user, db)
        
        # Parse plaintext (hex encoded)
        plaintext = bytes.fromhex(request.plaintext)
        
        # Measure encryption time
        start_time = time.perf_counter()
        
        # Encrypt based on algorithm
        if request.algorithm == "AES":
            ciphertext = aes_encrypt(key, plaintext)
        elif request.algorithm == "ASCON":
            nonce = b'\x00' * 16
            ciphertext, tag = ascon_encrypt(key, nonce, plaintext)
            ciphertext = ciphertext + tag
        elif request.algorithm == "SPECK":
            ciphertext = speck_encrypt(key, plaintext)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported algorithm"
            )
        
        end_time = time.perf_counter()
        execution_time_ms = (end_time - start_time) * 1000
        
        # Calculate throughput
        throughput_kbs = (len(plaintext) / 1024) / (execution_time_ms / 1000) if execution_time_ms > 0 else 0
        
        # Create operation record
        operation_id = str(uuid.uuid4())
        operation = Operation(
            operation_id=operation_id,
            operation_type="encrypt",
            algorithm=request.algorithm,
            input_size_bytes=len(plaintext),
            output_size_bytes=len(ciphertext),
            execution_time_ms=execution_time_ms,
            throughput_kbs=throughput_kbs,
            status="success",
            user_id=user_id,
            key_id=request.key_id
        )
        
        db.add(operation)
        db.commit()
        
        return EncryptionResponse(
            ciphertext=ciphertext.hex(),
            algorithm=request.algorithm,
            execution_time_ms=execution_time_ms,
            throughput_kbs=throughput_kbs,
            operation_id=operation_id
        )
    
    except Exception as e:
        # Create failed operation record
        operation_id = str(uuid.uuid4())
        operation = Operation(
            operation_id=operation_id,
            operation_type="encrypt",
            algorithm=request.algorithm,
            status="failed",
            error_message=str(e),
            user_id=user_id,
            key_id=request.key_id
        )
        db.add(operation)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Encryption failed: {str(e)}"
        )


@router.post("/decrypt", response_model=DecryptionResponse)
def decrypt_data(
    request: DecryptionRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Decrypt data
    
    Args:
        request: Decryption request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Decrypted data and metrics
    """
    user_id = int(current_user.get("sub"))
    
    try:
        # Get key
        key = _get_key_bytes(request.key_id, request.key, current_user, db)
        
        # Parse ciphertext
        ciphertext = bytes.fromhex(request.ciphertext)
        
        # Measure decryption time
        start_time = time.perf_counter()
        
        is_valid = True
        
        # Decrypt based on algorithm
        if request.algorithm == "AES":
            plaintext = aes_decrypt(key, ciphertext)
        elif request.algorithm == "ASCON":
            nonce = b'\x00' * 16
            ct = ciphertext[:-16]
            tag = ciphertext[-16:]
            plaintext, is_valid = ascon_decrypt(key, nonce, ct, tag)
        elif request.algorithm == "SPECK":
            plaintext = speck_decrypt(key, ciphertext)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported algorithm"
            )
        
        end_time = time.perf_counter()
        execution_time_ms = (end_time - start_time) * 1000
        
        # Create operation record
        operation_id = str(uuid.uuid4())
        operation = Operation(
            operation_id=operation_id,
            operation_type="decrypt",
            algorithm=request.algorithm,
            input_size_bytes=len(ciphertext),
            output_size_bytes=len(plaintext),
            execution_time_ms=execution_time_ms,
            status="success",
            user_id=user_id,
            key_id=request.key_id
        )
        
        db.add(operation)
        db.commit()
        
        return DecryptionResponse(
            plaintext=plaintext.hex(),
            algorithm=request.algorithm,
            is_valid=is_valid,
            execution_time_ms=execution_time_ms,
            operation_id=operation_id
        )
    
    except Exception as e:
        # Create failed operation record
        operation_id = str(uuid.uuid4())
        operation = Operation(
            operation_id=operation_id,
            operation_type="decrypt",
            algorithm=request.algorithm,
            status="failed",
            error_message=str(e),
            user_id=user_id,
            key_id=request.key_id
        )
        db.add(operation)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decryption failed: {str(e)}"
        )


@router.get("/operations", response_model=List[OperationDetailResponse])
def list_operations(
    algorithm: Optional[str] = None,
    operation_type: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List operations for current user
    
    Args:
        algorithm: Filter by algorithm
        operation_type: Filter by operation type
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of operations
    """
    user_id = int(current_user.get("sub"))
    
    query = db.query(Operation).filter(Operation.user_id == user_id)
    
    if algorithm:
        query = query.filter(Operation.algorithm == algorithm)
    
    if operation_type:
        query = query.filter(Operation.operation_type == operation_type)
    
    operations = query.order_by(Operation.created_at.desc()).all()
    
    return operations


@router.get("/operations/{operation_id}", response_model=OperationDetailResponse)
def get_operation(

    operation_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get operation details
    
    Args:
        operation_id: Operation ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Operation details
    """
    user_id = int(current_user.get("sub"))
    
    operation = db.query(Operation).filter(
        Operation.operation_id == operation_id,
        Operation.user_id == user_id
    ).first()
    
    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )
    
    return operation
