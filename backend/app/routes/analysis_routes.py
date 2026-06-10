"""
Analysis Routes
Purpose: Analyze entropy, randomness, and performance of keys
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.models.models import CryptographicKey, AnalysisResult, Operation, IoTDevice, Communication
from app.schemas.schemas import (
    AnalysisRequest, EntropyAnalysisResponse, AlgorithmComparisonResponse,
    DashboardStatisticsResponse, IoTOverviewResponse
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


@router.get("/iot-overview", response_model=IoTOverviewResponse)
def get_iot_overview(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """IoT-specific dashboard: protocol distribution, security stats, recent comms."""
    user_id = int(current_user.get("sub"))

    devices = db.query(IoTDevice).filter(IoTDevice.user_id == user_id).all()
    total = len(devices)
    secured = sum(1 for d in devices if d.is_secured)
    unsecured = total - secured
    security_score = round((secured / total * 100) if total else 0.0, 1)

    proto_dist = {"mqtt": 0, "coap": 0, "tls": 0}
    for d in devices:
        if d.is_secured and d.protocol and d.protocol in proto_dist:
            proto_dist[d.protocol] += 1

    keys = db.query(CryptographicKey).filter(CryptographicKey.user_id == user_id).all()
    method_dist = {"drbg": 0, "trng": 0, "puf": 0}
    for k in keys:
        m = (k.generation_method or "").lower()
        if m in method_dist:
            method_dist[m] += 1

    total_comms = db.query(Communication).filter(Communication.user_id == user_id).count()
    recent = (
        db.query(Communication)
        .filter(Communication.user_id == user_id)
        .order_by(Communication.created_at.desc())
        .limit(5)
        .all()
    )
    recent_list = [
        {
            "comm_id": c.comm_id,
            "source": c.source_device.device_name if c.source_device else "?",
            "target": c.target_device.device_name if c.target_device else "?",
            "protocol": c.protocol,
            "key_method": c.key_method,
            "transmission_time_ms": c.transmission_time_ms,
            "created_at": c.created_at.isoformat(),
        }
        for c in recent
    ]

    return IoTOverviewResponse(
        total_devices=total,
        secured_devices=secured,
        unsecured_devices=unsecured,
        security_score=security_score,
        protocol_distribution=proto_dist,
        key_method_distribution=method_dist,
        total_communications=total_comms,
        recent_communications=recent_list,
    )


@router.get("/protocols/comparison")
def get_protocol_comparison(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return average latency/performance by protocol from communication history."""
    user_id = int(current_user.get("sub"))

    comms = db.query(Communication).filter(Communication.user_id == user_id).all()

    # Group by protocol
    data: dict = {}
    for c in comms:
        p = c.protocol or "mqtt"
        if p not in data:
            data[p] = {"transmission": [], "encryption": [], "decryption": [], "total": [], "count": 0}
        data[p]["transmission"].append(c.transmission_time_ms or 0)
        data[p]["encryption"].append(c.encryption_time_ms or 0)
        data[p]["decryption"].append(c.decryption_time_ms or 0)
        total = (c.transmission_time_ms or 0) + (c.encryption_time_ms or 0) + (c.decryption_time_ms or 0)
        data[p]["total"].append(total)
        data[p]["count"] += 1

    # Fall back to typical benchmark values when no real data exists
    defaults = {
        "mqtt": {"avg_transmission": 11.5, "avg_total": 12.0, "overhead_pct": 12},
        "coap": {"avg_transmission": 7.0,  "avg_total": 7.5,  "overhead_pct": 8},
        "tls":  {"avg_transmission": 35.0, "avg_total": 36.0, "overhead_pct": 30},
    }

    result = []
    for proto in ["mqtt", "coap", "tls"]:
        if proto in data and data[proto]["count"] > 0:
            d = data[proto]
            avg = lambda lst: round(sum(lst) / len(lst), 3) if lst else 0
            result.append({
                "protocol": proto.upper(),
                "avg_transmission_ms": avg(d["transmission"]),
                "avg_encryption_ms": avg(d["encryption"]),
                "avg_decryption_ms": avg(d["decryption"]),
                "avg_total_ms": avg(d["total"]),
                "count": d["count"],
                "source": "measured",
            })
        else:
            def_val = defaults[proto]
            result.append({
                "protocol": proto.upper(),
                "avg_transmission_ms": def_val["avg_transmission"],
                "avg_encryption_ms": 0.15,
                "avg_decryption_ms": 0.10,
                "avg_total_ms": def_val["avg_total"],
                "count": 0,
                "source": "simulated_baseline",
            })

    return result


@router.get("/key-methods/comparison")
def get_key_method_comparison(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return entropy and performance comparison for key generation methods."""
    user_id = int(current_user.get("sub"))

    keys = db.query(CryptographicKey).filter(CryptographicKey.user_id == user_id).all()

    data: dict = {}
    for k in keys:
        m = (k.generation_method or "drbg").lower()
        if m not in data:
            data[m] = {"entropy": [], "randomness": []}
        if k.shannon_entropy is not None:
            data[m]["entropy"].append(k.shannon_entropy)
        if k.randomness_score is not None:
            data[m]["randomness"].append(k.randomness_score)

    # Baseline characteristics per method
    baselines = {
        "drbg": {"speed_ms": 0.3, "entropy_typical": 7.7, "randomness_typical": 96.0},
        "trng": {"speed_ms": 4.5, "entropy_typical": 7.95, "randomness_typical": 99.4},
        "puf":  {"speed_ms": 0.7, "entropy_typical": 6.8, "randomness_typical": 85.0},
    }

    result = []
    for method in ["drbg", "trng", "puf"]:
        b = baselines[method]
        avg_entropy = (
            round(sum(data[method]["entropy"]) / len(data[method]["entropy"]), 4)
            if method in data and data[method]["entropy"]
            else b["entropy_typical"]
        )
        avg_randomness = (
            round(sum(data[method]["randomness"]) / len(data[method]["randomness"]), 2)
            if method in data and data[method]["randomness"]
            else b["randomness_typical"]
        )
        result.append({
            "method": method.upper(),
            "avg_entropy": avg_entropy,
            "avg_randomness_score": avg_randomness,
            "generation_speed_ms": b["speed_ms"],
            "key_count": len(data.get(method, {}).get("entropy", [])),
            "security_level": "High" if method == "trng" else ("Medium" if method == "drbg" else "Device-tied"),
        })

    return result


@router.get("/security/report")
def get_security_report(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return per-device security status report."""
    user_id = int(current_user.get("sub"))

    devices = db.query(IoTDevice).filter(IoTDevice.user_id == user_id).all()

    report = []
    for d in devices:
        key_info = None
        if d.bound_key_id:
            k = db.query(CryptographicKey).filter(CryptographicKey.id == d.bound_key_id).first()
            if k:
                key_info = {
                    "key_id": k.key_id[:16] + "...",
                    "method": k.generation_method.upper(),
                    "length_bits": k.key_length_bits,
                    "randomness_score": round(k.randomness_score or 0, 1),
                    "shannon_entropy": round(k.shannon_entropy or 0, 4),
                }

        comm_count = db.query(Communication).filter(
            (Communication.source_device_id == d.id) | (Communication.target_device_id == d.id),
            Communication.user_id == user_id,
        ).count()

        score = key_info["randomness_score"] if key_info else 0
        if d.is_secured and key_info:
            if score >= 95:
                grade = "A"
            elif score >= 85:
                grade = "B"
            elif score >= 70:
                grade = "C"
            elif score >= 50:
                grade = "D"
            else:
                grade = "F"
        else:
            grade = "F"

        report.append({
            "device_id": d.id,
            "device_name": d.device_name,
            "device_type": d.device_type,
            "status": d.status,
            "is_secured": d.is_secured,
            "protocol": (d.protocol or "").upper() if d.protocol else None,
            "key_info": key_info,
            "communications": comm_count,
            "security_grade": grade,
        })

    return report


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
