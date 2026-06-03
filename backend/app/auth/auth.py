"""
Authentication Utilities
Purpose: JWT token management, password hashing, and security functions
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Configuration
SECRET_KEY = "IoT-Key-Generation-Platform-Secret-Key-2024"  # Should be in environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer scheme
security = HTTPBearer()


class PasswordHelper:
    """Password hashing and verification utilities"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password using bcrypt
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password
        """
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify password against hash
        
        Args:
            plain_password: Plain text password
            hashed_password: Hashed password
            
        Returns:
            True if password matches, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)


class JWTHandler:
    """JWT token management utilities"""
    
    @staticmethod
    def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create JWT access token
        
        Args:
            data: Data to encode in token
            expires_delta: Token expiration time delta
            
        Returns:
            JWT token string
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """
        Decode JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token data or None if invalid
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def verify_token_expiry(token_data: Dict) -> bool:
        """
        Verify token has not expired
        
        Args:
            token_data: Decoded token data
            
        Returns:
            True if token is valid, False if expired
        """
        exp = token_data.get("exp")
        if exp is None:
            return False
        
        expiry_datetime = datetime.fromtimestamp(exp)
        return datetime.utcnow() < expiry_datetime


class TokenManager:
    """Token lifecycle management"""
    
    def __init__(self):
        """Initialize token manager"""
        self.revoked_tokens = set()
    
    def revoke_token(self, token: str) -> None:
        """
        Revoke token
        
        Args:
            token: Token to revoke
        """
        self.revoked_tokens.add(token)
    
    def is_token_revoked(self, token: str) -> bool:
        """
        Check if token is revoked
        
        Args:
            token: Token to check
            
        Returns:
            True if revoked, False otherwise
        """
        return token in self.revoked_tokens
    
    def clear_expired_revocations(self, expiry_timestamp: int) -> None:
        """
        Clear expired revoked tokens (not implemented in simple version)
        
        Args:
            expiry_timestamp: Tokens expired before this timestamp are removed
        """
        pass


# Global token manager instance
token_manager = TokenManager()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """
    Dependency for protected routes - validates JWT token
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        Decoded token data
        
    Raises:
        HTTPException if token is invalid or expired
    """
    token = credentials.credentials
    
    # Check if token is revoked
    if token_manager.is_token_revoked(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )
    
    # Decode and verify token
    payload = JWTHandler.decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Verify token hasn't expired
    if not JWTHandler.verify_token_expiry(payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    return payload


async def get_current_admin_user(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Dependency for admin-only routes
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user if admin
        
    Raises:
        HTTPException if user is not admin
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user


class SecurityUtils:
    """General security utilities"""
    
    @staticmethod
    def generate_token_string(length: int = 32) -> str:
        """
        Generate random token string
        
        Args:
            length: Token length
            
        Returns:
            Random token string
        """
        import secrets
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, str]:
        """
        Validate password strength
        
        Args:
            password: Password to validate
            
        Returns:
            Tuple of (is_valid, message)
        """
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*" for c in password)
        
        if not (has_upper and has_lower and has_digit):
            return False, "Password must contain uppercase, lowercase, and numbers"
        
        return True, "Password is strong"
