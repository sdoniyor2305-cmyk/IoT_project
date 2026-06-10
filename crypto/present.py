"""
PRESENT Lightweight Block Cipher
Purpose: Ultra-lightweight block cipher for IoT devices
PRESENT-80: 64-bit block, 80-bit key, 31 rounds
Reference: Bogdanov et al., PRESENT: An Ultra-Lightweight Block Cipher
"""

import struct

SBOX = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD,
        0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]

SBOX_INV = [0] * 16
for i, v in enumerate(SBOX):
    SBOX_INV[v] = i

PERM = [
    0, 16, 32, 48, 1, 17, 33, 49, 2, 18, 34, 50, 3, 19, 35, 51,
    4, 20, 36, 52, 5, 21, 37, 53, 6, 22, 38, 54, 7, 23, 39, 55,
    8, 24, 40, 56, 9, 25, 41, 57, 10, 26, 42, 58, 11, 27, 43, 59,
    12, 28, 44, 60, 13, 29, 45, 61, 14, 30, 46, 62, 15, 31, 47, 63,
]


def _sbox_layer(state: int) -> int:
    result = 0
    for i in range(16):
        nibble = (state >> (i * 4)) & 0xF
        result |= SBOX[nibble] << (i * 4)
    return result


def _sbox_layer_inv(state: int) -> int:
    result = 0
    for i in range(16):
        nibble = (state >> (i * 4)) & 0xF
        result |= SBOX_INV[nibble] << (i * 4)
    return result


def _perm_layer(state: int) -> int:
    result = 0
    for i in range(64):
        if (state >> i) & 1:
            result |= 1 << PERM[i]
    return result


def _perm_layer_inv(state: int) -> int:
    result = 0
    PERM_INV = [0] * 64
    for i, p in enumerate(PERM):
        PERM_INV[p] = i
    for i in range(64):
        if (state >> i) & 1:
            result |= 1 << PERM_INV[i]
    return result


def _generate_round_keys(key: bytes) -> list:
    if len(key) != 10:
        raise ValueError("PRESENT-80 requires a 10-byte (80-bit) key")
    # Load key as 80-bit integer
    key_reg = int.from_bytes(key, 'big')
    round_keys = []
    for i in range(32):
        # Extract 64-bit round key from leftmost bits
        round_keys.append(key_reg >> 16)
        # Rotate left by 61
        key_reg = ((key_reg << 61) | (key_reg >> 19)) & ((1 << 80) - 1)
        # Apply S-Box to top nibble
        top = (key_reg >> 76) & 0xF
        key_reg = (key_reg & ~(0xF << 76)) | (SBOX[top] << 76)
        # XOR round counter into bits [19:15]
        key_reg ^= (i + 1) << 15
    return round_keys


def present_encrypt(key: bytes, plaintext: bytes) -> bytes:
    if len(plaintext) != 8:
        raise ValueError("Block must be 8 bytes")
    round_keys = _generate_round_keys(key)
    state = int.from_bytes(plaintext, 'big')
    for i in range(31):
        state ^= round_keys[i]
        state = _sbox_layer(state)
        state = _perm_layer(state)
    state ^= round_keys[31]
    return state.to_bytes(8, 'big')


def present_decrypt(key: bytes, ciphertext: bytes) -> bytes:
    if len(ciphertext) != 8:
        raise ValueError("Block must be 8 bytes")
    round_keys = _generate_round_keys(key)
    state = int.from_bytes(ciphertext, 'big')
    state ^= round_keys[31]
    for i in range(30, -1, -1):
        state = _perm_layer_inv(state)
        state = _sbox_layer_inv(state)
        state ^= round_keys[i]
    return state.to_bytes(8, 'big')


def _pad(data: bytes) -> bytes:
    pad_len = 8 - (len(data) % 8)
    return data + bytes([pad_len] * pad_len)


def _unpad(data: bytes) -> bytes:
    pad_len = data[-1]
    return data[:-pad_len]


def present_encrypt_ecb(key: bytes, plaintext: bytes) -> bytes:
    padded = _pad(plaintext)
    result = b''
    for i in range(0, len(padded), 8):
        result += present_encrypt(key, padded[i:i+8])
    return result


def present_decrypt_ecb(key: bytes, ciphertext: bytes) -> bytes:
    result = b''
    for i in range(0, len(ciphertext), 8):
        result += present_decrypt(key, ciphertext[i:i+8])
    return _unpad(result)
