"""
Authentication Routes
Purpose: User registration, login, and logout endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.models import User, Session as SessionModel
from app.schemas.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse
from app.auth.auth import PasswordHelper, JWTHandler, get_current_user, token_manager, ACCESS_TOKEN_EXPIRE_MINUTES
from app.utils.database import get_db, log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Register new user
    
    Args:
        request: User registration data
        db: Database session
        
    Returns:
        Created user data
    """
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    from app.auth.auth import SecurityUtils
    is_strong, message = SecurityUtils.validate_password_strength(request.password)
    if not is_strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password too weak: {message}"
        )
    
    # Hash password
    hashed_password = PasswordHelper.hash_password(request.password)
    
    # Create new user
    new_user = User(
        username=request.username,
        email=request.email,
        hashed_password=hashed_password,
        full_name=request.full_name
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_action(db, new_user.id, new_user.username, "USER_REGISTER", "user", str(new_user.id))
    return new_user


@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Login user and return JWT token
    
    Args:
        request: Login credentials
        db: Database session
        
    Returns:
        JWT token and user information
    """
    # Find user by username
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not PasswordHelper.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create JWT token
    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "is_admin": user.is_admin
    }
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = JWTHandler.create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    log_action(db, user.id, user.username, "USER_LOGIN", "user", str(user.id))

    # Store session in database
    token_exp = JWTHandler.decode_token(access_token)["exp"]
    session = SessionModel(
        token=access_token,
        user_id=user.id,
        expires_at=datetime.utcfromtimestamp(token_exp),
        is_active=True
    )
    db.add(session)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id
    )


@router.post("/logout")
def logout(current_user = Depends(get_current_user)):
    """
    Logout user and revoke token
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Logout confirmation
    """
    # In a real application, you would revoke the token here
    token_manager.revoke_token(current_user)
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get current authenticated user information
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Current user data
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user
