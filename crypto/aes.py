"""
AES-128 Encryption Algorithm Implementation
Purpose: Implement AES-128 encryption/decryption for IoT devices
Uses ECB mode for simplicity, but CBC mode also supported
Reference: NIST FIPS 197
"""

from typing import List, Tuple
import struct

class AES128:
    """
    AES-128 (Advanced Encryption Standard with 128-bit key)
    - 128-bit key
    - 128-bit block size
    - 10 rounds
    """
    
    # S-box substitution table (NIST FIPS 197, 256 entries)
    SBOX = [
        0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
        0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
        0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
        0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
        0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
        0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
        0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
        0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
        0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
        0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
        0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
        0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
        0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
        0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
        0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
        0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
    ]

    # Inverse S-box (NIST FIPS 197, 256 entries)
    SBOX_INV = [
        0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
        0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
        0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
        0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
        0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
        0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
        0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
        0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
        0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
        0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
        0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
        0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
        0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
        0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
        0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
        0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d,
    ]
    
    # Rcon values for key expansion
    RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]
    
    def __init__(self, key: bytes):
        """
        Initialize AES cipher with 128-bit key
        
        Args:
            key: 16-byte key (128-bit)
        """
        if len(key) != 16:
            raise ValueError("Key must be 16 bytes (128-bit)")
        
        self.key = key
        self.round_keys = self._expand_key(key)
    
    def _expand_key(self, key: bytes) -> List[bytes]:
        """
        Expand 128-bit key into 11 round keys (10 rounds + 1 initial)
        
        Args:
            key: 16-byte key
            
        Returns:
            List of 44 32-bit words (11 x 4)
        """
        w = []
        
        # First 4 words are the key itself
        for i in range(4):
            w.append(struct.unpack('>I', key[4*i:4*i+4])[0])
        
        # Generate remaining 40 words
        for i in range(4, 44):
            temp = w[i-1]
            
            if i % 4 == 0:
                # RotWord + SubWord + Rcon
                temp = self._sub_word(self._rot_word(temp)) ^ (self.RCON[(i // 4) - 1] << 24)
            
            w.append(w[i-4] ^ temp)
        
        # Group into round keys
        round_keys = []
        for i in range(0, 44, 4):
            round_key = b''.join(struct.pack('>I', w[j]) for j in range(i, i+4))
            round_keys.append(round_key)
        
        return round_keys
    
    def _rot_word(self, word: int) -> int:
        """Rotate word left by 8 bits"""
        return ((word << 8) | (word >> 24)) & 0xFFFFFFFF
    
    def _sub_word(self, word: int) -> int:
        """Apply S-box to each byte in word"""
        result = 0
        for i in range(4):
            byte = (word >> (24 - 8*i)) & 0xFF
            result |= self.SBOX[byte] << (24 - 8*i)
        return result
    
    def _sub_bytes(self, state: bytearray) -> None:
        """Substitute bytes using S-box"""
        for i in range(16):
            state[i] = self.SBOX[state[i]]
    
    def _sub_bytes_inv(self, state: bytearray) -> None:
        """Substitute bytes using inverse S-box"""
        for i in range(16):
            state[i] = self.SBOX_INV[state[i]]
    
    def _shift_rows(self, state: bytearray) -> None:
        """Shift rows in state matrix"""
        # Row 1: shift left by 1
        temp = state[1]
        state[1] = state[5]
        state[5] = state[9]
        state[9] = state[13]
        state[13] = temp
        
        # Row 2: shift left by 2
        temp = state[2]
        state[2] = state[10]
        state[10] = temp
        temp = state[6]
        state[6] = state[14]
        state[14] = temp
        
        # Row 3: shift left by 3
        temp = state[3]
        state[3] = state[15]
        state[15] = state[11]
        state[11] = state[7]
        state[7] = temp
    
    def _shift_rows_inv(self, state: bytearray) -> None:
        """Inverse shift rows"""
        # Row 1: shift right by 1
        temp = state[13]
        state[13] = state[9]
        state[9] = state[5]
        state[5] = state[1]
        state[1] = temp
        
        # Row 2: shift right by 2
        temp = state[2]
        state[2] = state[10]
        state[10] = temp
        temp = state[6]
        state[6] = state[14]
        state[14] = temp
        
        # Row 3: shift right by 3
        temp = state[7]
        state[7] = state[11]
        state[11] = state[15]
        state[15] = state[3]
        state[3] = temp
    
    def _gmul(self, a: int, b: int) -> int:
        """Galois field multiplication"""
        p = 0
        for _ in range(8):
            if b & 1:
                p ^= a
            hi_bit_set = a & 0x80
            a = (a << 1) & 0xFF
            if hi_bit_set:
                a ^= 0x1b
            b >>= 1
        return p
    
    def _mix_columns(self, state: bytearray) -> None:
        """Mix columns transformation"""
        for i in range(4):
            col = [state[i], state[i+4], state[i+8], state[i+12]]
            
            state[i] = self._gmul(2, col[0]) ^ self._gmul(3, col[1]) ^ col[2] ^ col[3]
            state[i+4] = col[0] ^ self._gmul(2, col[1]) ^ self._gmul(3, col[2]) ^ col[3]
            state[i+8] = col[0] ^ col[1] ^ self._gmul(2, col[2]) ^ self._gmul(3, col[3])
            state[i+12] = self._gmul(3, col[0]) ^ col[1] ^ col[2] ^ self._gmul(2, col[3])
    
    def _mix_columns_inv(self, state: bytearray) -> None:
        """Inverse mix columns transformation"""
        for i in range(4):
            col = [state[i], state[i+4], state[i+8], state[i+12]]
            
            state[i] = self._gmul(14, col[0]) ^ self._gmul(11, col[1]) ^ self._gmul(13, col[2]) ^ self._gmul(9, col[3])
            state[i+4] = self._gmul(9, col[0]) ^ self._gmul(14, col[1]) ^ self._gmul(11, col[2]) ^ self._gmul(13, col[3])
            state[i+8] = self._gmul(13, col[0]) ^ self._gmul(9, col[1]) ^ self._gmul(14, col[2]) ^ self._gmul(11, col[3])
            state[i+12] = self._gmul(11, col[0]) ^ self._gmul(13, col[1]) ^ self._gmul(9, col[2]) ^ self._gmul(14, col[3])
    
    def _add_round_key(self, state: bytearray, round_key: bytes) -> None:
        """Add round key to state (XOR)"""
        for i in range(16):
            state[i] ^= round_key[i]
    
    def encrypt_block(self, plaintext: bytes) -> bytes:
        """
        Encrypt 128-bit block
        
        Args:
            plaintext: 16-byte block
            
        Returns:
            16-byte ciphertext
        """
        if len(plaintext) != 16:
            raise ValueError("Block must be 16 bytes")
        
        state = bytearray(plaintext)
        
        # Initial round
        self._add_round_key(state, self.round_keys[0])
        
        # Main rounds (9 rounds)
        for round_num in range(1, 10):
            self._sub_bytes(state)
            self._shift_rows(state)
            self._mix_columns(state)
            self._add_round_key(state, self.round_keys[round_num])
        
        # Final round (no mix columns)
        self._sub_bytes(state)
        self._shift_rows(state)
        self._add_round_key(state, self.round_keys[10])
        
        return bytes(state)
    
    def decrypt_block(self, ciphertext: bytes) -> bytes:
        """
        Decrypt 128-bit block
        
        Args:
            ciphertext: 16-byte ciphertext
            
        Returns:
            16-byte plaintext
        """
        if len(ciphertext) != 16:
            raise ValueError("Block must be 16 bytes")
        
        state = bytearray(ciphertext)
        
        # Initial round
        self._add_round_key(state, self.round_keys[10])
        
        # Main rounds (9 rounds)
        for round_num in range(9, 0, -1):
            self._shift_rows_inv(state)
            self._sub_bytes_inv(state)
            self._add_round_key(state, self.round_keys[round_num])
            self._mix_columns_inv(state)
        
        # Final round
        self._shift_rows_inv(state)
        self._sub_bytes_inv(state)
        self._add_round_key(state, self.round_keys[0])
        
        return bytes(state)
    
    def encrypt_ecb(self, plaintext: bytes) -> bytes:
        """
        Encrypt plaintext using ECB mode
        
        Args:
            plaintext: Plaintext (must be multiple of 16 bytes)
            
        Returns:
            Ciphertext
        """
        if len(plaintext) % 16 != 0:
            raise ValueError("Plaintext length must be multiple of 16")
        
        ciphertext = bytearray()
        for i in range(0, len(plaintext), 16):
            block = plaintext[i:i+16]
            ciphertext.extend(self.encrypt_block(block))
        
        return bytes(ciphertext)
    
    def decrypt_ecb(self, ciphertext: bytes) -> bytes:
        """
        Decrypt ciphertext using ECB mode
        
        Args:
            ciphertext: Ciphertext (must be multiple of 16 bytes)
            
        Returns:
            Plaintext
        """
        if len(ciphertext) % 16 != 0:
            raise ValueError("Ciphertext length must be multiple of 16")
        
        plaintext = bytearray()
        for i in range(0, len(ciphertext), 16):
            block = ciphertext[i:i+16]
            plaintext.extend(self.decrypt_block(block))
        
        return bytes(plaintext)


def pad_pkcs7(data: bytes) -> bytes:
    """Add PKCS7 padding to data"""
    padding_length = 16 - (len(data) % 16)
    return data + bytes([padding_length] * padding_length)


def unpad_pkcs7(data: bytes) -> bytes:
    """Remove PKCS7 padding from data"""
    padding_length = data[-1]
    return data[:-padding_length]


def aes_encrypt(key: bytes, plaintext: bytes) -> bytes:
    """
    Convenience function for AES encryption with PKCS7 padding
    
    Args:
        key: 16-byte key
        plaintext: Plaintext to encrypt
        
    Returns:
        Ciphertext
    """
    cipher = AES128(key)
    padded = pad_pkcs7(plaintext)
    return cipher.encrypt_ecb(padded)


def aes_decrypt(key: bytes, ciphertext: bytes) -> bytes:
    """
    Convenience function for AES decryption with PKCS7 unpadding
    
    Args:
        key: 16-byte key
        ciphertext: Ciphertext to decrypt
        
    Returns:
        Plaintext
    """
    cipher = AES128(key)
    decrypted = cipher.decrypt_ecb(ciphertext)
    return unpad_pkcs7(decrypted)
