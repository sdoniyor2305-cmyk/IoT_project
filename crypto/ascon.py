"""
ASCON Lightweight Encryption Algorithm Implementation
Purpose: Implement ASCON-128 encryption/decryption for IoT devices
Reference: ASCON v1.2 specification (https://ascon.iaik.tugraz.at)
"""

import struct
from typing import Tuple

_MASK64 = 0xFFFFFFFFFFFFFFFF


def _rotr64(x: int, n: int) -> int:
    return ((x >> n) | (x << (64 - n))) & _MASK64


def _permute(state: list, n_rounds: int) -> None:
    """In-place ASCON permutation (pa=12 rounds, pb=6 rounds)."""
    # Round constants: the last n_rounds of the 12 total constants
    rc_all = [0xf0, 0xe1, 0xd2, 0xc3, 0xb4, 0xa5, 0x96, 0x87, 0x78, 0x69, 0x5a, 0x4b]
    rcs = rc_all[12 - n_rounds:]

    s0, s1, s2, s3, s4 = state
    for rc in rcs:
        # Constant addition
        s2 ^= rc
        # Substitution layer (chi-like, parallel across 64 bit positions)
        s0 ^= s4
        s4 ^= s3
        s2 ^= s1
        t = [s0 ^ ((~s1) & _MASK64),
             s1 ^ ((~s2) & _MASK64),
             s2 ^ ((~s3) & _MASK64),
             s3 ^ ((~s4) & _MASK64),
             s4 ^ ((~s0) & _MASK64)]
        s0, s1, s2, s3, s4 = t[0] & _MASK64, t[1] & _MASK64, t[2] & _MASK64, t[3] & _MASK64, t[4] & _MASK64
        s1 ^= s0
        s0 ^= s4
        s3 ^= s2
        s2 = (~s2) & _MASK64
        # Linear diffusion layer
        s0 ^= _rotr64(s0, 19) ^ _rotr64(s0, 28)
        s1 ^= _rotr64(s1, 61) ^ _rotr64(s1, 39)
        s2 ^= _rotr64(s2,  1) ^ _rotr64(s2,  6)
        s3 ^= _rotr64(s3, 10) ^ _rotr64(s3, 17)
        s4 ^= _rotr64(s4,  7) ^ _rotr64(s4, 41)
    state[:] = [s0, s1, s2, s3, s4]


def _bytes_to_int(b: bytes) -> int:
    return int.from_bytes(b.ljust(8, b'\x00'), 'big')


def _int_to_bytes(n: int, length: int = 8) -> bytes:
    return (n & _MASK64).to_bytes(8, 'big')[:length]


def _pad_block(data: bytes, rate: int = 8) -> bytes:
    """Pad data to multiple of rate bytes using 0x80 || 0* padding."""
    pad_len = rate - len(data) % rate
    return data + b'\x80' + b'\x00' * (pad_len - 1)


class ASCON:
    """
    ASCON-128 lightweight authenticated encryption.
    State: 5 × 64-bit words. Rate = 64 bits. Pa=12, Pb=6 rounds.
    """

    IV = 0x80400c0600000000  # ASCON-128 IV

    def __init__(self, key: bytes, nonce: bytes):
        if len(key) != 16:
            raise ValueError("Key must be 16 bytes (128-bit)")
        if len(nonce) != 16:
            raise ValueError("Nonce must be 16 bytes (128-bit)")
        self.key = key
        self.nonce = nonce
        self._k0, self._k1 = struct.unpack(">QQ", key)
        self._n0, self._n1 = struct.unpack(">QQ", nonce)

    def _init_state(self) -> list:
        state = [self.IV, self._k0, self._k1, self._n0, self._n1]
        _permute(state, 12)
        state[3] ^= self._k0
        state[4] ^= self._k1
        return state

    def _process_ad(self, state: list, ad: bytes) -> None:
        """Absorb associated data into state."""
        if ad:
            padded = _pad_block(ad, 8)
            for i in range(0, len(padded), 8):
                state[0] ^= _bytes_to_int(padded[i:i + 8])
                _permute(state, 6)
        state[4] ^= 1  # domain separation

    def encrypt(self, plaintext: bytes, associated_data: bytes = b'') -> Tuple[bytes, bytes]:
        state = self._init_state()
        self._process_ad(state, associated_data)

        pt_padded = _pad_block(plaintext, 8)
        n_blocks = len(pt_padded) // 8
        ciphertext = bytearray()

        for i in range(n_blocks):
            p_block = pt_padded[i * 8:(i + 1) * 8]
            p_int = _bytes_to_int(p_block)
            state[0] ^= p_int
            c_int = state[0]

            real_bytes = min(8, len(plaintext) - i * 8)
            if real_bytes > 0:
                ciphertext.extend(_int_to_bytes(c_int, real_bytes))

            if i < n_blocks - 1:
                _permute(state, 6)

        # Finalization
        state[1] ^= self._k0
        state[2] ^= self._k1
        _permute(state, 12)
        state[3] ^= self._k0
        state[4] ^= self._k1

        tag = struct.pack(">QQ", state[3], state[4])
        return bytes(ciphertext), tag

    def decrypt(self, ciphertext: bytes, tag: bytes, associated_data: bytes = b'') -> Tuple[bytes, bool]:
        state = self._init_state()
        self._process_ad(state, associated_data)

        ct_len = len(ciphertext)
        # Padding is always appended, so if ct_len is a multiple of 8, there's
        # an extra pure-padding block to absorb (matching what encryption did).
        if ct_len % 8 == 0:
            n_blocks = ct_len // 8 + 1
        else:
            n_blocks = (ct_len + 7) // 8

        plaintext = bytearray()

        for i in range(n_blocks):
            real_bytes = min(8, ct_len - i * 8) if ct_len > 0 else 0
            c_chunk = ciphertext[i * 8:i * 8 + real_bytes]

            if real_bytes == 8:
                # Non-last full block
                c_int = _bytes_to_int(c_chunk)
                p_int = state[0] ^ c_int
                plaintext.extend(_int_to_bytes(p_int, 8))
                # State update: reconstruct what encryption did (XOR padded pt)
                # For full block, padded pt = pt, so state[0] ^= p_int (= s0 ^ c) → s0 = c
                state[0] ^= p_int
                _permute(state, 6)
            else:
                # Last (potentially partial) block
                # Decrypt real bytes
                s0_bytes = _int_to_bytes(state[0], 8)
                p_bytes = bytes(a ^ b for a, b in zip(s0_bytes[:real_bytes], c_chunk))
                plaintext.extend(p_bytes)
                # Reconstruct padded plaintext that was absorbed during encryption
                p_padded = p_bytes + b'\x80' + b'\x00' * (7 - real_bytes)
                p_padded_int = _bytes_to_int(p_padded)
                state[0] ^= p_padded_int

        # Finalization
        state[1] ^= self._k0
        state[2] ^= self._k1
        _permute(state, 12)
        state[3] ^= self._k0
        state[4] ^= self._k1

        computed_tag = struct.pack(">QQ", state[3], state[4])
        return bytes(plaintext), computed_tag == tag


def ascon_encrypt(key: bytes, nonce: bytes, plaintext: bytes,
                   associated_data: bytes = b'') -> Tuple[bytes, bytes]:
    return ASCON(key, nonce).encrypt(plaintext, associated_data)


def ascon_decrypt(key: bytes, nonce: bytes, ciphertext: bytes, tag: bytes,
                   associated_data: bytes = b'') -> Tuple[bytes, bool]:
    return ASCON(key, nonce).decrypt(ciphertext, tag, associated_data)
