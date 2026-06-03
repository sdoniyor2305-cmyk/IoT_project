"""
SPECK Lightweight Cipher Implementation
Purpose: Implement SPECK encryption/decryption for IoT devices
SPECK is ultra-lightweight and optimized for constraint devices
Reference: NSA SPECK v1.0 specification
"""

from typing import Tuple, List
import struct

class SPECK:
    """
    SPECK-64/128 lightweight cipher
    - 64-bit block size
    - 128-bit key
    - 27 rounds
    Optimized for IoT and embedded systems
    """
    
    def __init__(self, key: bytes, block_size: int = 64):
        """
        Initialize SPECK cipher
        
        Args:
            key: 16-byte key (128-bit)
            block_size: Block size in bits (default: 64)
        """
        if len(key) != 16:
            raise ValueError("Key must be 16 bytes (128-bit)")
        
        self.key = key
        self.block_size = block_size
        self.rounds = 27  # 27 rounds for 64-bit block with 128-bit key
        self.round_keys = self._key_schedule(key)
    
    def _key_schedule(self, key: bytes) -> List[int]:
        """
        Generate round keys from master key
        
        Args:
            key: 128-bit key
            
        Returns:
            List of round keys
        """
        # Extract key words (32-bit words for 64-bit block SPECK)
        k = []
        for i in range(0, 16, 4):
            word = struct.unpack('<I', key[i:i+4])[0]
            k.append(word)
        
        # Key schedule
        round_keys = [k[0]]
        
        for i in range(self.rounds - 1):
            temp = k[3]
            temp = self._ror32(temp, 8)
            temp ^= k[0]
            k_next = [temp ^ i]
            
            k_next.extend(k[1:])
            k = k_next
            round_keys.append(k[0])
        
        return round_keys
    
    def _ror32(self, x: int, n: int) -> int:
        """Rotate right 32-bit value by n bits"""
        n = n % 32
        return ((x >> n) | (x << (32 - n))) & 0xFFFFFFFF
    
    def _rol32(self, x: int, n: int) -> int:
        """Rotate left 32-bit value by n bits"""
        n = n % 32
        return ((x << n) | (x >> (32 - n))) & 0xFFFFFFFF
    
    def _encrypt_round(self, x: int, y: int, key: int) -> Tuple[int, int]:
        """Single SPECK encryption round"""
        x = self._ror32(x, 8)
        x = (x + y) & 0xFFFFFFFF
        x = x ^ key
        y = self._rol32(y, 3)
        y = y ^ x
        return x, y
    
    def _decrypt_round(self, x: int, y: int, key: int) -> Tuple[int, int]:
        """Single SPECK decryption round"""
        y = y ^ x
        y = self._ror32(y, 3)
        x = x ^ key
        x = (x - y) & 0xFFFFFFFF
        x = self._rol32(x, 8)
        return x, y
    
    def encrypt_block(self, plaintext: bytes) -> bytes:
        """
        Encrypt 64-bit block
        
        Args:
            plaintext: 8-byte block
            
        Returns:
            8-byte ciphertext
        """
        if len(plaintext) != 8:
            raise ValueError("Block must be 8 bytes for SPECK-64")
        
        # Extract plaintext words (32-bit words)
        x = struct.unpack('<I', plaintext[0:4])[0]
        y = struct.unpack('<I', plaintext[4:8])[0]
        
        # Encryption rounds
        for i in range(self.rounds):
            x, y = self._encrypt_round(x, y, self.round_keys[i])
        
        # Pack ciphertext
        ciphertext = struct.pack('<I', x) + struct.pack('<I', y)
        return ciphertext
    
    def decrypt_block(self, ciphertext: bytes) -> bytes:
        """
        Decrypt 64-bit block
        
        Args:
            ciphertext: 8-byte ciphertext
            
        Returns:
            8-byte plaintext
        """
        if len(ciphertext) != 8:
            raise ValueError("Block must be 8 bytes for SPECK-64")
        
        # Extract ciphertext words
        x = struct.unpack('<I', ciphertext[0:4])[0]
        y = struct.unpack('<I', ciphertext[4:8])[0]
        
        # Decryption rounds (reverse order)
        for i in range(self.rounds - 1, -1, -1):
            x, y = self._decrypt_round(x, y, self.round_keys[i])
        
        # Pack plaintext
        plaintext = struct.pack('<I', x) + struct.pack('<I', y)
        return plaintext
    
    def encrypt_ecb(self, plaintext: bytes) -> bytes:
        """
        Encrypt plaintext using ECB mode
        
        Args:
            plaintext: Plaintext (must be multiple of 8 bytes)
            
        Returns:
            Ciphertext
        """
        if len(plaintext) % 8 != 0:
            raise ValueError("Plaintext length must be multiple of 8")
        
        ciphertext = bytearray()
        for i in range(0, len(plaintext), 8):
            block = plaintext[i:i+8]
            ciphertext.extend(self.encrypt_block(block))
        
        return bytes(ciphertext)
    
    def decrypt_ecb(self, ciphertext: bytes) -> bytes:
        """
        Decrypt ciphertext using ECB mode
        
        Args:
            ciphertext: Ciphertext (must be multiple of 8 bytes)
            
        Returns:
            Plaintext
        """
        if len(ciphertext) % 8 != 0:
            raise ValueError("Ciphertext length must be multiple of 8")
        
        plaintext = bytearray()
        for i in range(0, len(ciphertext), 8):
            block = ciphertext[i:i+8]
            plaintext.extend(self.decrypt_block(block))
        
        return bytes(plaintext)


def pad_speck(data: bytes) -> bytes:
    """
    Pad data to multiple of 8 bytes using PKCS7-like padding
    
    Args:
        data: Data to pad
        
    Returns:
        Padded data
    """
    padding_length = 8 - (len(data) % 8)
    return data + bytes([padding_length] * padding_length)


def unpad_speck(data: bytes) -> bytes:
    """
    Remove SPECK padding
    
    Args:
        data: Padded data
        
    Returns:
        Unpadded data
    """
    padding_length = data[-1]
    return data[:-padding_length]


def speck_encrypt(key: bytes, plaintext: bytes) -> bytes:
    """
    Convenience function for SPECK encryption with padding
    
    Args:
        key: 16-byte key
        plaintext: Plaintext to encrypt
        
    Returns:
        Ciphertext
    """
    cipher = SPECK(key)
    padded = pad_speck(plaintext)
    return cipher.encrypt_ecb(padded)


def speck_decrypt(key: bytes, ciphertext: bytes) -> bytes:
    """
    Convenience function for SPECK decryption with unpadding
    
    Args:
        key: 16-byte key
        ciphertext: Ciphertext to decrypt
        
    Returns:
        Plaintext
    """
    cipher = SPECK(key)
    decrypted = cipher.decrypt_ecb(ciphertext)
    return unpad_speck(decrypted)
