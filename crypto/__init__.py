"""
Cryptographic Algorithms Module
Lightweight encryption for IoT devices
"""

from .ascon import ASCON, ascon_encrypt, ascon_decrypt
from .aes import AES128, aes_encrypt, aes_decrypt, pad_pkcs7, unpad_pkcs7
from .speck import SPECK, speck_encrypt, speck_decrypt, pad_speck, unpad_speck
from .keygen import KeyGenerator, DRBG_CTR, TRNG_Simulator, PUF_Simulator, generate_device_keys
from .analysis import EntropyAnalyzer, PerformanceAnalyzer, AlgorithmComparator

__all__ = [
    'ASCON',
    'ascon_encrypt',
    'ascon_decrypt',
    'AES128',
    'aes_encrypt',
    'aes_decrypt',
    'pad_pkcs7',
    'unpad_pkcs7',
    'SPECK',
    'speck_encrypt',
    'speck_decrypt',
    'pad_speck',
    'unpad_speck',
    'KeyGenerator',
    'DRBG_CTR',
    'TRNG_Simulator',
    'PUF_Simulator',
    'generate_device_keys',
    'EntropyAnalyzer',
    'PerformanceAnalyzer',
    'AlgorithmComparator'
]
