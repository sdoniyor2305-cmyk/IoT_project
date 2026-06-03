"""
Pydantic Schemas for Request/Response validation
Purpose: Define data validation schemas for FastAPI
"""

from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
from typing import Optional, List, Dict, Any

# ==================== Authentication Schemas ====================

class UserRegisterRequest(BaseModel):
    """User registration request"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    
    class Config:
        example = {
            "username": "john_doe",
            "email": "john@example.com",
            "password": "SecurePassword123!",
            "full_name": "John Doe"
        }


class UserLoginRequest(BaseModel):
    """User login request"""
    username: str
    password: str
    
    class Config:
        example = {
            "username": "john_doe",
            "password": "SecurePassword123!"
        }


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int
    
    class Config:
        example = {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer",
            "expires_in": 3600,
            "user_id": 1
        }


class UserResponse(BaseModel):
    """User response (without password)"""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    role: Optional[str] = "user"
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== IoT Device Schemas ====================

class IoTDeviceCreateRequest(BaseModel):
    """Create IoT device request"""
    device_id: str = Field(..., min_length=3, max_length=100)
    device_name: str = Field(..., max_length=100)
    device_type: str = Field(..., max_length=50)
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    cpu_type: Optional[str] = None
    memory_kb: Optional[int] = None
    storage_kb: Optional[int] = None
    
    class Config:
        example = {
            "device_id": "IOT_DEVICE_001",
            "device_name": "Temperature Sensor",
            "device_type": "sensor",
            "manufacturer": "SensorCorp",
            "model": "TMP36",
            "cpu_type": "ARM Cortex-M0",
            "memory_kb": 32,
            "storage_kb": 256
        }


class IoTDeviceResponse(BaseModel):
    """IoT device response"""
    id: int
    device_id: str
    device_name: str
    device_type: str
    status: str
    is_active: bool
    last_seen: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class IoTDeviceDetailResponse(IoTDeviceResponse):
    """Detailed IoT device response"""
    manufacturer: Optional[str]
    model: Optional[str]
    description: Optional[str]
    cpu_type: Optional[str]
    memory_kb: Optional[int]
    storage_kb: Optional[int]


# ==================== Key Generation Schemas ====================

class KeyGenerationRequest(BaseModel):
    """Key generation request"""
    key_length_bits: int = Field(..., description="64, 128, or 256 bits")
    generation_method: str = Field(..., description="drbg, trng, or puf")
    algorithm: str = Field(..., description="ASCON, AES, or SPECK")
    device_id: Optional[int] = None
    description: Optional[str] = None
    
    @validator('key_length_bits')
    def validate_key_length(cls, v):
        if v not in [64, 128, 256]:
            raise ValueError('Key length must be 64, 128, or 256 bits')
        return v
    
    @validator('generation_method')
    def validate_generation_method(cls, v):
        if v not in ['drbg', 'trng', 'puf']:
            raise ValueError('Generation method must be drbg, trng, or puf')
        return v
    
    @validator('algorithm')
    def validate_algorithm(cls, v):
        if v not in ['ASCON', 'AES', 'SPECK']:
            raise ValueError('Algorithm must be ASCON, AES, or SPECK')
        return v
    
    class Config:
        example = {
            "key_length_bits": 128,
            "generation_method": "drbg",
            "algorithm": "AES",
            "device_id": 1,
            "description": "Master encryption key for device"
        }


class CryptographicKeyResponse(BaseModel):
    """Cryptographic key response"""
    id: int
    key_id: str
    key_length_bits: int
    generation_method: str
    algorithm_used: str
    is_active: bool
    randomness_score: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CryptographicKeyDetailResponse(CryptographicKeyResponse):
    """Detailed cryptographic key response"""
    key_value: str  # Hex encoded
    shannon_entropy: Optional[float]
    min_entropy: Optional[float]
    collision_entropy: Optional[float]
    is_exported: bool
    export_count: int
    expiry_date: Optional[datetime]


# ==================== Encryption Schemas ====================

class EncryptionRequest(BaseModel):
    """Encryption request"""
    plaintext: str = Field(..., description="Plaintext to encrypt (hex or base64)")
    key_id: int
    algorithm: str = Field(..., description="ASCON, AES, or SPECK")
    key: Optional[str] = None  # For external keys
    
    class Config:
        example = {
            "plaintext": "48656c6c6f20576f726c64",
            "key_id": 1,
            "algorithm": "AES"
        }


class EncryptionResponse(BaseModel):
    """Encryption response"""
    ciphertext: str
    algorithm: str
    execution_time_ms: float
    throughput_kbs: float
    operation_id: str
    
    class Config:
        example = {
            "ciphertext": "a1b2c3d4e5f6...",
            "algorithm": "AES",
            "execution_time_ms": 1.23,
            "throughput_kbs": 512.0,
            "operation_id": "OP_001"
        }


class DecryptionRequest(BaseModel):
    """Decryption request"""
    ciphertext: str = Field(..., description="Ciphertext to decrypt (hex)")
    key_id: int
    algorithm: str = Field(..., description="ASCON, AES, or SPECK")
    key: Optional[str] = None
    
    class Config:
        example = {
            "ciphertext": "a1b2c3d4e5f6...",
            "key_id": 1,
            "algorithm": "AES"
        }


class DecryptionResponse(BaseModel):
    """Decryption response"""
    plaintext: str
    algorithm: str
    is_valid: bool
    execution_time_ms: float
    operation_id: str
    
    class Config:
        example = {
            "plaintext": "48656c6c6f20576f726c64",
            "algorithm": "AES",
            "is_valid": True,
            "execution_time_ms": 1.23,
            "operation_id": "OP_002"
        }


# ==================== Analysis Schemas ====================

class AnalysisRequest(BaseModel):
    """Analysis request"""
    key_id: int
    analysis_type: str = Field(..., description="entropy, randomness, or performance")
    
    class Config:
        example = {
            "key_id": 1,
            "analysis_type": "entropy"
        }


class EntropyAnalysisResponse(BaseModel):
    """Entropy analysis response"""
    analysis_id: str
    shannon_entropy: float
    min_entropy: float
    collision_entropy: float
    frequency_test: Dict[str, Any]
    runs_test: Dict[str, Any]
    autocorrelation_test: Dict[str, Any]
    coupon_collector_test: Dict[str, Any]
    overall_randomness_score: float
    passes_all_tests: bool
    
    class Config:
        example = {
            "analysis_id": "ANAL_001",
            "shannon_entropy": 7.98,
            "min_entropy": 7.5,
            "collision_entropy": 7.95,
            "frequency_test": {"chi_squared": 245.3, "is_random": True},
            "runs_test": {"runs": 512, "is_random": True},
            "autocorrelation_test": {"autocorrelation": 0.02, "is_random": True},
            "coupon_collector_test": {"unique_values": 256},
            "overall_randomness_score": 95.5,
            "passes_all_tests": True
        }


# ==================== Operation Schemas ====================

class OperationResponse(BaseModel):
    """Operation response"""
    id: int
    operation_id: str
    operation_type: str
    algorithm: str
    execution_time_ms: Optional[float]
    throughput_kbs: Optional[float]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class OperationDetailResponse(OperationResponse):
    """Detailed operation response"""
    input_size_bytes: Optional[int]
    output_size_bytes: Optional[int]
    memory_used_kb: Optional[float]
    cpu_usage_percent: Optional[float]
    error_message: Optional[str]


# ==================== Dashboard Schemas ====================

class DashboardStatisticsResponse(BaseModel):
    """Dashboard statistics response"""
    total_devices: int
    online_devices: int
    total_keys: int
    total_operations: int
    avg_entropy_score: float
    total_throughput_kbs: float
    
    class Config:
        example = {
            "total_devices": 10,
            "online_devices": 8,
            "total_keys": 25,
            "total_operations": 150,
            "avg_entropy_score": 94.2,
            "total_throughput_kbs": 5240.5
        }


class AlgorithmComparisonResponse(BaseModel):
    """Algorithm comparison response"""
    algorithm: str
    avg_execution_time_ms: float
    avg_throughput_kbs: float
    total_operations: int
    success_rate: float
    
    class Config:
        example = {
            "algorithm": "AES",
            "avg_execution_time_ms": 1.5,
            "avg_throughput_kbs": 512.0,
            "total_operations": 50,
            "success_rate": 100.0
        }


# ==================== Error Schemas ====================

class DeviceStatusUpdateRequest(BaseModel):
    """Device status update request"""
    status: str = Field(..., description="online, offline, or error")


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        example = {
            "error": "ValidationError",
            "message": "Invalid input parameters"
        }


# ==================== Admin Schemas ====================

class AdminUserResponse(BaseModel):
    """Admin view of a user with aggregate counts"""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    role: Optional[str] = "user"
    created_at: datetime
    device_count: int = 0
    key_count: int = 0

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    """System-wide statistics for admin dashboard"""
    total_users: int
    active_users: int
    total_devices: int
    online_devices: int
    total_keys: int
    total_operations: int
    total_encrypt: int
    total_decrypt: int


class AuditLogResponse(BaseModel):
    """Audit log entry"""
    id: int
    user_id: Optional[int]
    username: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminDeviceResponse(BaseModel):
    """Admin view of a device including owner info"""
    id: int
    device_id: str
    device_name: str
    device_type: str
    status: str
    memory_kb: Optional[int]
    owner_username: str
    created_at: datetime


class AdminKeyResponse(BaseModel):
    """Admin view of a key including owner info"""
    id: int
    key_id: str
    key_length_bits: int
    generation_method: str
    algorithm_used: str
    randomness_score: Optional[float]
    owner_username: str
    created_at: datetime


class AdminOperationResponse(BaseModel):
    """Admin view of an operation including owner info"""
    id: int
    operation_id: str
    operation_type: str
    algorithm: str
    execution_time_ms: Optional[float]
    status: str
    owner_username: str
    created_at: datetime
