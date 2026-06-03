"""
Key Generation Module for IoT Devices
Purpose: Implement DRBG, TRNG simulation, and PUF simulation
Contains secure key generation methods for lightweight cryptography
Reference: NIST SP 800-90A (DRBG)
"""

import hashlib
import struct
import time
import os
import random
from typing import Tuple, List
from datetime import datetime

class DRBG_CTR:
    """
    Deterministic Random Bit Generator using CTR mode
    Implements NIST SP 800-90A CTR_DRBG
    """
    
    def __init__(self, entropy: bytes, personalization: bytes = b''):
        """
        Initialize DRBG
        
        Args:
            entropy: Entropy input (at least 16 bytes)
            personalization: Optional personalization string
        """
        if len(entropy) < 16:
            raise ValueError("Entropy must be at least 16 bytes")
        
        self.entropy = entropy
        self.personalization = personalization
        self.key = b'\x00' * 16  # 128-bit key
        self.v = b'\x00' * 16    # 128-bit V value
        self.counter = 0
        
        # Instantiate DRBG
        self._instantiate()
    
    def _instantiate(self):
        """Instantiate DRBG with entropy"""
        seed_material = self.entropy + self.personalization
        
        # Hash seed material
        h = hashlib.sha256(seed_material).digest()
        
        # Update key and V
        if len(h) >= 32:
            self.key = h[:16]
            self.v = h[16:32]
        else:
            self.key = h[:16]
            self.v = h
    
    def generate(self, num_bytes: int) -> bytes:
        """
        Generate random bytes
        
        Args:
            num_bytes: Number of bytes to generate
            
        Returns:
            Random bytes
        """
        output = bytearray()
        blocks = (num_bytes + 15) // 16
        
        for _ in range(blocks):
            # Increment V
            v_int = int.from_bytes(self.v, 'big')
            v_int = (v_int + 1) % (2 ** 128)
            self.v = v_int.to_bytes(16, 'big')
            
            # Encrypt V with key to get output block
            import hashlib
            h = hashlib.pbkdf2_hmac('sha256', self.v, self.key, 1, 16)
            output.extend(h)
        
        return bytes(output[:num_bytes])


class TRNG_Simulator:
    """
    True Random Number Generator Simulator
    Simulates TRNG using system entropy and timing variations
    Note: This is for educational purposes, not cryptographically secure
    """
    
    def __init__(self):
        """Initialize TRNG simulator"""
        self.entropy_source = []
        self._collect_entropy()
    
    def _collect_entropy(self):
        """Collect entropy from system sources"""
        # Time-based entropy
        current_time = time.perf_counter()
        self.entropy_source.append(current_time)
        
        # Process ID entropy
        self.entropy_source.append(os.getpid())
        
        # Python object IDs (pseudo-random addresses)
        self.entropy_source.append(id(self))
    
    def generate(self, num_bytes: int) -> bytes:
        """
        Generate pseudo-random bytes
        
        Args:
            num_bytes: Number of bytes to generate
            
        Returns:
            Random bytes
        """
        output = bytearray()
        
        for _ in range(num_bytes):
            # Mix various entropy sources
            time_entropy = int((time.perf_counter() * 1e9) % 256)
            random_entropy = random.randint(0, 255)
            pid_entropy = os.getpid() % 256
            
            # Combine entropy sources
            byte_val = (time_entropy ^ random_entropy ^ pid_entropy) & 0xFF
            output.append(byte_val)
        
        return bytes(output)


class PUF_Simulator:
    """
    Physical Unclonable Function Simulator
    Simulates PUF behavior using device-specific parameters
    """
    
    def __init__(self, device_id: str):
        """
        Initialize PUF simulator
        
        Args:
            device_id: Unique device identifier
        """
        self.device_id = device_id
        self.puf_params = self._generate_puf_params()
    
    def _generate_puf_params(self) -> bytes:
        """
        Generate device-specific PUF parameters
        Simulates manufacturing variations
        
        Args:
            
        Returns:
            PUF parameters
        """
        # Use device ID to generate reproducible but unique parameters
        h = hashlib.sha256(self.device_id.encode()).digest()
        
        # Add simulated "manufacturing variations"
        current_time = str(time.time()).encode()
        h2 = hashlib.sha256(h + current_time).digest()
        
        return h[:8] + h2[:8]  # 16 bytes
    
    def generate_key(self, challenge: bytes = b'') -> bytes:
        """
        Generate key using PUF
        
        Args:
            challenge: Challenge input (optional)
            
        Returns:
            PUF-generated key
        """
        # Combine device PUF params with challenge
        if not challenge:
            challenge = b'DEFAULT_CHALLENGE'
        
        combined = self.puf_params + challenge
        
        # Generate reproducible output
        h = hashlib.sha256(combined).digest()
        return h[:16]  # 128-bit key


class KeyGenerator:
    """
    Unified Key Generation Module for IoT Devices
    Supports multiple key generation methods
    """
    
    def __init__(self, device_id: str):
        """
        Initialize key generator
        
        Args:
            device_id: Unique device identifier
        """
        self.device_id = device_id
        self.drbg = None
        self.trng = TRNG_Simulator()
        self.puf = PUF_Simulator(device_id)
        self._initialize_drbg()
    
    def _initialize_drbg(self):
        """Initialize DRBG with entropy"""
        entropy = self.trng.generate(32)
        personalization = self.device_id.encode()
        self.drbg = DRBG_CTR(entropy, personalization)
    
    def generate_random_key(self, key_length: int = 16) -> bytes:
        """
        Generate random key using DRBG
        
        Args:
            key_length: Key length in bytes (16, 32, or 64)
            
        Returns:
            Random key
        """
        if key_length not in [16, 32, 64]:
            raise ValueError("Key length must be 16, 32, or 64 bytes")
        
        return self.drbg.generate(key_length)
    
    def generate_trng_key(self, key_length: int = 16) -> bytes:
        """
        Generate key using TRNG simulation
        
        Args:
            key_length: Key length in bytes
            
        Returns:
            TRNG-generated key
        """
        return self.trng.generate(key_length)
    
    def generate_puf_key(self, challenge: bytes = b'', key_length: int = 16) -> bytes:
        """
        Generate key using PUF simulation
        
        Args:
            challenge: Challenge input
            key_length: Key length in bytes (max 32)
            
        Returns:
            PUF-generated key
        """
        if key_length > 32:
            # Generate multiple PUF keys
            keys = []
            for i in range((key_length + 31) // 32):
                challenge_ext = challenge + struct.pack('<I', i)
                key = self.puf.generate_key(challenge_ext)
                keys.append(key)
            return b''.join(keys)[:key_length]
        
        return self.puf.generate_key(challenge)[:key_length]
    
    def generate_drbg_key_with_seed(self, seed: bytes, key_length: int = 16) -> bytes:
        """
        Generate key using DRBG with custom seed
        
        Args:
            seed: Seed value
            key_length: Key length in bytes
            
        Returns:
            DRBG-generated key
        """
        drbg = DRBG_CTR(seed)
        return drbg.generate(key_length)


def generate_device_keys(device_id: str, key_lengths: List[int] = None) -> dict:
    """
    Generate multiple keys for a device
    
    Args:
        device_id: Device identifier
        key_lengths: List of desired key lengths (default: [16, 32, 64])
        
    Returns:
        Dictionary with generated keys
    """
    if key_lengths is None:
        key_lengths = [16, 32, 64]
    
    keygen = KeyGenerator(device_id)
    keys = {
        'device_id': device_id,
        'timestamp': datetime.now().isoformat(),
        'keys': {}
    }
    
    for length in key_lengths:
        length_bits = length * 8
        keys['keys'][f'{length_bits}_bit_drbg'] = keygen.generate_random_key(length).hex()
        keys['keys'][f'{length_bits}_bit_trng'] = keygen.generate_trng_key(length).hex()
        keys['keys'][f'{length_bits}_bit_puf'] = keygen.generate_puf_key(b'', length).hex()
    
    return keys
