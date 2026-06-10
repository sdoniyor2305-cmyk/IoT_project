"""
Pydantic Schemas for Request/Response validation
"""

from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
from typing import Optional, List, Dict, Any

# ==================== Authentication Schemas ====================

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int


class UserResponse(BaseModel):
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
    device_id: str = Field(..., min_length=3, max_length=100)
    device_name: str = Field(..., max_length=100)
    device_type: str = Field(..., max_length=50)
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    description: Optional[str] = None
    cpu_type: Optional[str] = None
    memory_kb: Optional[int] = None
    storage_kb: Optional[int] = None


class IoTDeviceResponse(BaseModel):
    id: int
    device_id: str
    device_name: str
    device_type: str
    status: str
    is_active: bool
    last_seen: Optional[datetime]
    created_at: datetime
    protocol: Optional[str] = None
    is_secured: bool = False
    bound_key_id: Optional[int] = None

    class Config:
        from_attributes = True


class IoTDeviceDetailResponse(IoTDeviceResponse):
    manufacturer: Optional[str]
    model: Optional[str]
    description: Optional[str]
    cpu_type: Optional[str]
    memory_kb: Optional[int]
    storage_kb: Optional[int]


class DeviceBindKeyRequest(BaseModel):
    protocol: str = Field(..., description="mqtt, coap, or tls")
    generation_method: str = Field(..., description="drbg, trng, or puf")
    key_length_bits: int = Field(..., description="80, 128, or 256")
    algorithm: str = Field(..., description="present, speck, or ascon")

    @validator('protocol')
    def validate_protocol(cls, v):
        if v not in ['mqtt', 'coap', 'tls']:
            raise ValueError('Protocol must be mqtt, coap, or tls')
        return v

    @validator('generation_method')
    def validate_method(cls, v):
        if v not in ['drbg', 'trng', 'puf']:
            raise ValueError('Generation method must be drbg, trng, or puf')
        return v

    @validator('key_length_bits')
    def validate_length(cls, v):
        if v not in [80, 128, 256]:
            raise ValueError('Key length must be 80, 128, or 256')
        return v

    @validator('algorithm')
    def validate_algorithm(cls, v):
        if v not in ['present', 'speck', 'ascon']:
            raise ValueError('Algorithm must be present, speck, or ascon')
        return v


class DeviceBindKeyResponse(BaseModel):
    device_id: int
    device_name: str
    device_type: str
    protocol: str
    is_secured: bool
    key_id: int
    key_hex: str
    key_length_bits: int
    generation_method: str
    recommended_method: str
    match_status: str
    randomness_score: float
    shannon_entropy: Optional[float] = None
    algorithm_used: Optional[str] = None


class CommunicationSimulateRequest(BaseModel):
    source_device_id: int
    target_device_id: int
    message: str = Field(..., min_length=1, max_length=500)


# ==================== Key Generation Schemas ====================

class KeyGenerationRequest(BaseModel):
    key_length_bits: int = Field(..., description="80, 128, or 256 bits")
    generation_method: str = Field(..., description="drbg, trng, or puf")
    device_id: Optional[int] = None
    description: Optional[str] = None

    @validator('key_length_bits')
    def validate_key_length(cls, v):
        if v not in [64, 80, 128, 256]:
            raise ValueError('Key length must be 64, 80, 128, or 256 bits')
        return v

    @validator('generation_method')
    def validate_generation_method(cls, v):
        if v not in ['drbg', 'trng', 'puf']:
            raise ValueError('Generation method must be drbg, trng, or puf')
        return v


class CryptographicKeyResponse(BaseModel):
    id: int
    key_id: str
    key_length_bits: int
    generation_method: str
    is_active: bool
    randomness_score: Optional[float]
    created_at: datetime
    bound_protocol: Optional[str] = None
    device_id: Optional[int] = None

    class Config:
        from_attributes = True


class CryptographicKeyListResponse(CryptographicKeyResponse):
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    shannon_entropy: Optional[float] = None
    algorithm_used: Optional[str] = None


class CryptographicKeyDetailResponse(CryptographicKeyResponse):
    key_value: str
    shannon_entropy: Optional[float]
    min_entropy: Optional[float]
    collision_entropy: Optional[float]
    is_exported: bool
    export_count: int
    expiry_date: Optional[datetime]


# ==================== Analysis Schemas ====================

class AnalysisRequest(BaseModel):
    key_id: int
    analysis_type: str = Field(..., description="entropy, randomness, or performance")


class EntropyAnalysisResponse(BaseModel):
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


# ==================== Operation Schemas ====================

class OperationResponse(BaseModel):
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
    input_size_bytes: Optional[int]
    output_size_bytes: Optional[int]
    memory_used_kb: Optional[float]
    cpu_usage_percent: Optional[float]
    error_message: Optional[str]


# ==================== Dashboard Schemas ====================

class DashboardStatisticsResponse(BaseModel):
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


class IoTOverviewResponse(BaseModel):
    total_devices: int
    secured_devices: int
    unsecured_devices: int
    security_score: float
    protocol_distribution: Dict[str, int]
    key_method_distribution: Dict[str, int]
    total_communications: int
    recent_communications: List[Dict[str, Any]]
    algorithm_distribution: Optional[Dict[str, int]] = None


class MethodComparisonResponse(BaseModel):
    method: str
    avg_entropy: float
    avg_randomness_score: float
    generation_speed_ms: float
    key_count: int
    security_level: str


# ==================== Error Schemas ====================

class DeviceStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="online, offline, or error")


class ErrorResponse(BaseModel):
    error: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ==================== Admin Schemas ====================

class AdminUserResponse(BaseModel):
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
    total_users: int
    active_users: int
    total_devices: int
    online_devices: int
    total_keys: int
    total_operations: int
    total_encrypt: int
    total_decrypt: int


class AuditLogResponse(BaseModel):
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
    id: int
    device_id: str
    device_name: str
    device_type: str
    status: str
    memory_kb: Optional[int]
    owner_username: str
    created_at: datetime


class AdminKeyResponse(BaseModel):
    id: int
    key_id: str
    key_length_bits: int
    generation_method: str
    randomness_score: Optional[float]
    owner_username: str
    created_at: datetime


class AdminOperationResponse(BaseModel):
    id: int
    operation_id: str
    operation_type: str
    algorithm: str
    execution_time_ms: Optional[float]
    status: str
    owner_username: str
    created_at: datetime
