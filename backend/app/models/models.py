"""
Database Models for IoT Key Generation Platform
Purpose: Define data structures for users, devices, keys, operations, and communications
Uses SQLAlchemy ORM with SQLite
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    """
    User model for authentication and device management
    """
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    role = Column(String(20), default='user')  # 'user' or 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    devices = relationship('IoTDevice', back_populates='owner')
    keys = relationship('CryptographicKey', back_populates='owner')
    operations = relationship('Operation', back_populates='user')
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username})>"


class IoTDevice(Base):
    """
    IoT Device model for device management
    """
    __tablename__ = 'iot_devices'
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, index=True, nullable=False)
    device_name = Column(String(100), nullable=False)
    device_type = Column(String(50))  # sensor, actuator, gateway, etc.
    manufacturer = Column(String(100))
    model = Column(String(100))
    description = Column(Text)
    
    # Status and connectivity
    status = Column(String(20), default='offline')  # online, offline, error
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime)
    
    # Device specifications
    cpu_type = Column(String(100))
    memory_kb = Column(Integer)  # RAM in KB
    storage_kb = Column(Integer)  # Storage in KB

    # IoT Protocol binding
    protocol = Column(String(20))  # mqtt, coap, tls
    is_secured = Column(Boolean, default=False)
    bound_key_id = Column(Integer, nullable=True)  # FK avoided to prevent circular ref

    # User relationship
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    owner = relationship('User', back_populates='devices')

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    keys = relationship('CryptographicKey', back_populates='device')
    operations = relationship('Operation', back_populates='device')
    
    def __repr__(self):
        return f"<IoTDevice(id={self.id}, device_id={self.device_id})>"


class CryptographicKey(Base):
    """
    Cryptographic Key model for generated keys
    """
    __tablename__ = 'cryptographic_keys'
    
    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(100), unique=True, index=True, nullable=False)
    
    # Key properties
    key_value = Column(String(256), nullable=False)  # Hex encoded
    key_length_bits = Column(Integer, nullable=False)  # 64, 128, 256
    key_format = Column(String(20), default='hex')  # hex, base64, etc.
    
    # Generation method
    generation_method = Column(String(50), nullable=False)  # drbg, trng, puf
    algorithm_used = Column(String(50), nullable=False)  # AES, ASCON, SPECK
    bound_protocol = Column(String(20))  # mqtt, coap, tls (set when key is bound to a device)
    
    # Properties
    is_active = Column(Boolean, default=True)
    is_exported = Column(Boolean, default=False)
    export_count = Column(Integer, default=0)
    
    # Entropy metrics
    shannon_entropy = Column(Float)
    min_entropy = Column(Float)
    collision_entropy = Column(Float)
    randomness_score = Column(Float)  # 0-100
    
    # Relationships
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    owner = relationship('User', back_populates='keys')
    
    device_id = Column(Integer, ForeignKey('iot_devices.id'))
    device = relationship('IoTDevice', back_populates='keys')
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expiry_date = Column(DateTime)
    
    # Relationships
    operations = relationship('Operation', back_populates='key')
    
    def __repr__(self):
        return f"<CryptographicKey(id={self.id}, key_id={self.key_id})>"


class Operation(Base):
    """
    Operation model for encryption/decryption operations
    """
    __tablename__ = 'operations'
    
    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(String(100), unique=True, index=True, nullable=False)
    
    # Operation details
    operation_type = Column(String(50), nullable=False)  # encrypt, decrypt, keygen
    algorithm = Column(String(50), nullable=False)  # ASCON, AES, SPECK
    
    # Data size information
    input_size_bytes = Column(Integer)
    output_size_bytes = Column(Integer)
    
    # Performance metrics
    execution_time_ms = Column(Float)
    throughput_kbs = Column(Float)
    memory_used_kb = Column(Float)
    cpu_usage_percent = Column(Float)
    
    # Status
    status = Column(String(20), default='success')  # success, failed, pending
    error_message = Column(Text)
    
    # Relationships
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    user = relationship('User', back_populates='operations')
    
    device_id = Column(Integer, ForeignKey('iot_devices.id'))
    device = relationship('IoTDevice', back_populates='operations')
    
    key_id = Column(Integer, ForeignKey('cryptographic_keys.id'))
    key = relationship('CryptographicKey', back_populates='operations')
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Operation(id={self.id}, operation_id={self.operation_id})>"


class AnalysisResult(Base):
    """
    Analysis Result model for storing analysis of generated keys
    """
    __tablename__ = 'analysis_results'
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(100), unique=True, index=True, nullable=False)
    
    # Analysis details
    analysis_type = Column(String(50), nullable=False)  # entropy, randomness, performance
    
    # Test results (JSON format for flexibility)
    frequency_test = Column(JSON)
    runs_test = Column(JSON)
    autocorrelation_test = Column(JSON)
    coupon_collector_test = Column(JSON)
    
    # Scores and metrics
    overall_randomness_score = Column(Float)  # 0-100
    passes_all_tests = Column(Boolean)
    
    # Related data
    key_id = Column(Integer, ForeignKey('cryptographic_keys.id'))
    operation_id = Column(Integer, ForeignKey('operations.id'))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<AnalysisResult(id={self.id}, analysis_id={self.analysis_id})>"


class Session(Base):
    """
    Session model for JWT token tracking
    """
    __tablename__ = 'sessions'
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(512), unique=True, nullable=False)
    
    # User information
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Token details
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_revoked = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Session(id={self.id}, user_id={self.user_id})>"


class AuditLog(Base):
    """Audit log for tracking user and admin actions"""
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    username = Column(String(50))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(100))
    details = Column(Text)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, username={self.username})>"


class Communication(Base):
    """IoT device-to-device communication simulation records"""
    __tablename__ = 'communications'

    id = Column(Integer, primary_key=True, index=True)
    comm_id = Column(String(100), unique=True, index=True, nullable=False)

    source_device_id = Column(Integer, ForeignKey('iot_devices.id'))
    target_device_id = Column(Integer, ForeignKey('iot_devices.id'))

    protocol = Column(String(20))       # mqtt, coap, tls
    algorithm = Column(String(20))      # AES, ASCON, SPECK
    encrypted_message = Column(Text)
    original_message = Column(Text)

    transmission_time_ms = Column(Float)
    encryption_time_ms = Column(Float)
    decryption_time_ms = Column(Float)

    key_method = Column(String(50))     # drbg, trng, puf
    key_length_bits = Column(Integer)

    status = Column(String(20), default='success')
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)

    source_device = relationship('IoTDevice', foreign_keys=[source_device_id])
    target_device = relationship('IoTDevice', foreign_keys=[target_device_id])

    def __repr__(self):
        return f"<Communication(id={self.id}, comm_id={self.comm_id}, protocol={self.protocol})>"
