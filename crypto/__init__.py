"""
Cryptographic Algorithms Module
Lightweight encryption for IoT devices
"""

from .ascon import ASCON, ascon_encrypt, ascon_decrypt
from .aes import AES128, aes_encrypt, aes_decrypt, pad_pkcs7, unpad_pkcs7
from .speck import SPECK, speck_encrypt, speck_decrypt, pad_speck, unpad_speck
from .present import present_encrypt, present_decrypt, present_encrypt_ecb, present_decrypt_ecb
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
    'present_encrypt',
    'present_decrypt',
    'present_encrypt_ecb',
    'present_decrypt_ecb',
    'KeyGenerator',
    'DRBG_CTR',
    'TRNG_Simulator',
    'PUF_Simulator',
    'generate_device_keys',
    'EntropyAnalyzer',
    'PerformanceAnalyzer',
    'AlgorithmComparator'
]
