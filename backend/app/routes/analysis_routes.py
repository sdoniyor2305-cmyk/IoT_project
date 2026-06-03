"""
Analysis Routes
Purpose: Analyze entropy, randomness, and performance of keys
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.models.models import CryptographicKey, AnalysisResult, Operation
from app.schemas.schemas import (
    AnalysisRequest, EntropyAnalysisResponse, AlgorithmComparisonResponse,
    DashboardStatisticsResponse
)
from app.auth.auth import get_current_user
from app.utils.database import get_db

from crypto.analysis import EntropyAnalyzer, PerformanceAnalyzer, AlgorithmComparator

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/entropy", response_model=EntropyAnalysisResponse)
def analyze_entropy(
    request: AnalysisRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze entropy of key
    
    Args:
        request: Analysis request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Entropy analysis results
    """
    user_id = int(current_user.get("sub"))
    
    # Get key
    key = db.query(CryptographicKey).filter(
        CryptographicKey.id == request.key_id,
        CryptographicKey.user_id == user_id
    ).first()
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key not found"
        )
    
    # Convert hex to bytes
    key_bytes = bytes.fromhex(key.key_value)
    
    # Perform comprehensive analysis
    analysis = EntropyAnalyzer.comprehensive_analysis(key_bytes)
    
    # Calculate overall randomness score
    tests_passed = 0
    total_tests = 4
    
    if analysis['frequency_test'].get('is_random'):
        tests_passed += 1
    if analysis['runs_test'].get('is_random'):
        tests_passed += 1
    if analysis['autocorrelation_test'].get('is_random'):
        tests_passed += 1
    if analysis['coupon_collector_test'].get('chi_squared', 1000) < 1000:
        tests_passed += 1
    
    overall_score = (tests_passed / total_tests) * 100
    passes_all_tests = tests_passed == total_tests
    
    # Store analysis result in database
    analysis_id = str(uuid.uuid4())
    result = AnalysisResult(
        analysis_id=analysis_id,
        analysis_type="entropy",
        frequency_test=analysis['frequency_test'],
        runs_test=analysis['runs_test'],
        autocorrelation_test=analysis['autocorrelation_test'],
        coupon_collector_test=analysis['coupon_collector_test'],
        overall_randomness_score=overall_score,
        passes_all_tests=passes_all_tests,
        key_id=key.id
    )
    
    db.add(result)
    db.commit()
    
    return EntropyAnalysisResponse(
        analysis_id=analysis_id,
        shannon_entropy=analysis['shannon_entropy'],
        min_entropy=analysis['min_entropy'],
        collision_entropy=analysis['collision_entropy'],
        frequency_test=analysis['frequency_test'],
        runs_test=analysis['runs_test'],
        autocorrelation_test=analysis['autocorrelation_test'],
        coupon_collector_test=analysis['coupon_collector_test'],
        overall_randomness_score=overall_score,
        passes_all_tests=passes_all_tests
    )


@router.get("/performance/comparison", response_model=List[AlgorithmComparisonResponse])
def get_algorithm_comparison(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get performance comparison of algorithms
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Algorithm comparison data
    """
    user_id = int(current_user.get("sub"))
    
    algorithms = ["ASCON", "AES", "SPECK"]
    results = []
    
    for algo in algorithms:
        # Get operations for this algorithm
        operations = db.query(Operation).filter(
            Operation.user_id == user_id,
            Operation.algorithm == algo,
            Operation.status == "success"
        ).all()
        
        if not operations:
            continue
        
        # Calculate metrics
        avg_execution_time = sum(op.execution_time_ms for op in operations) / len(operations)
        avg_throughput = sum(op.throughput_kbs for op in operations if op.throughput_kbs) / len(operations)
        success_count = len([op for op in operations if op.status == "success"])
        success_rate = (success_count / len(operations)) * 100 if operations else 0
        
        results.append(AlgorithmComparisonResponse(
            algorithm=algo,
            avg_execution_time_ms=avg_execution_time,
            avg_throughput_kbs=avg_throughput,
            total_operations=len(operations),
            success_rate=success_rate
        ))
    
    return results


@router.get("/dashboard/statistics", response_model=DashboardStatisticsResponse)
def get_dashboard_statistics(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dashboard statistics
    """
    user_id = int(current_user.get("sub"))
    
    # Import models
    from app.models.models import IoTDevice
    
    # Count devices
    total_devices = db.query(IoTDevice).filter(
        IoTDevice.user_id == user_id
    ).count()
    
    online_devices = db.query(IoTDevice).filter(
        IoTDevice.user_id == user_id,
        IoTDevice.status == "online"
    ).count()
    
    # Count keys
    total_keys = db.query(CryptographicKey).filter(
        CryptographicKey.user_id == user_id
    ).count()
    
    # Count operations
    total_operations = db.query(Operation).filter(
        Operation.user_id == user_id
    ).count()
    
    # Calculate average entropy score
    keys_with_entropy = db.query(CryptographicKey).filter(
        CryptographicKey.user_id == user_id,
        CryptographicKey.randomness_score.isnot(None)
    ).all()
    
    avg_entropy = 0
    if keys_with_entropy:
        avg_entropy = sum(k.randomness_score for k in keys_with_entropy) / len(keys_with_entropy)
    
    # Calculate total throughput
    operations = db.query(Operation).filter(
        Operation.user_id == user_id,
        Operation.throughput_kbs.isnot(None)
    ).all()
    
    total_throughput = sum(op.throughput_kbs for op in operations) if operations else 0
    
    return DashboardStatisticsResponse(
        total_devices=total_devices,
        online_devices=online_devices,
        total_keys=total_keys,
        total_operations=total_operations,
        avg_entropy_score=avg_entropy,
        total_throughput_kbs=total_throughput
    )


@router.get("/keys/{key_id}/history")
def get_key_usage_history(
    key_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get usage history of key
    
    Args:
        key_id: Key ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Key usage history
    """
    user_id = int(current_user.get("sub"))
    
    # Verify key ownership
    key = db.query(CryptographicKey).filter(
        CryptographicKey.id == key_id,
        CryptographicKey.user_id == user_id
    ).first()
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key not found"
        )
    
    # Get operations using this key
    operations = db.query(Operation).filter(
        Operation.key_id == key_id,
        Operation.user_id == user_id
    ).order_by(Operation.created_at.desc()).all()
    
    return {
        "key_id": key.key_id,
        "total_uses": len(operations),
        "operations": [
            {
                "operation_id": op.operation_id,
                "type": op.operation_type,
                "algorithm": op.algorithm,
                "execution_time_ms": op.execution_time_ms,
                "status": op.status,
                "created_at": op.created_at
            }
            for op in operations
        ]
    }


@router.get("/algorithms/{algorithm}/statistics")
def get_algorithm_statistics(
    algorithm: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics for specific algorithm
    
    Args:
        algorithm: Algorithm name
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Algorithm statistics
    """
    user_id = int(current_user.get("sub"))
    
    if algorithm not in ["ASCON", "AES", "SPECK"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid algorithm"
        )
    
    # Get all operations for this algorithm
    operations = db.query(Operation).filter(
        Operation.user_id == user_id,
        Operation.algorithm == algorithm
    ).all()
    
    if not operations:
        return {
            "algorithm": algorithm,
            "total_operations": 0,
            "statistics": {}
        }
    
    # Calculate statistics
    successful = len([op for op in operations if op.status == "success"])
    failed = len([op for op in operations if op.status == "failed"])
    
    encrypt_ops = [op for op in operations if op.operation_type == "encrypt"]
    decrypt_ops = [op for op in operations if op.operation_type == "decrypt"]
    
    avg_encrypt_time = sum(op.execution_time_ms for op in encrypt_ops) / len(encrypt_ops) if encrypt_ops else 0
    avg_decrypt_time = sum(op.execution_time_ms for op in decrypt_ops) / len(decrypt_ops) if decrypt_ops else 0
    
    return {
        "algorithm": algorithm,
        "total_operations": len(operations),
        "successful": successful,
        "failed": failed,
        "success_rate": (successful / len(operations)) * 100,
        "encrypt_operations": len(encrypt_ops),
        "decrypt_operations": len(decrypt_ops),
        "avg_encrypt_time_ms": avg_encrypt_time,
        "avg_decrypt_time_ms": avg_decrypt_time,
        "total_data_processed_bytes": sum((op.input_size_bytes or 0) for op in operations)
    }
