"""
Authentication service for user login and token management.
"""
from typing import Optional
from datetime import datetime, timedelta
import uuid
from fastapi import HTTPException, status
from app.models import User, UserInDB, LoginRequest, Token, TokenData
from app.core.security import verify_password, create_access_token, get_password_hash
from app.storage.json_db import db
from app.config import settings


class AuthService:
    """Service for handling authentication operations."""
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
        """
        Authenticate a user by email and password.
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            UserInDB if authenticated, None otherwise
        """
        user_data = db.get_user_by_email(email)
        
        if not user_data:
            return None
        
        if not verify_password(password, user_data["hashed_password"]):
            return None
        
        if not user_data.get("is_active", True):
            return None
        
        return UserInDB(**user_data)
    
    @staticmethod
    def login(login_request: LoginRequest) -> Token:
        """
        Login a user and return access token.
        
        Args:
            login_request: Login credentials
            
        Returns:
            JWT token
            
        Raises:
            HTTPException: If authentication fails
        """
        user = AuthService.authenticate_user(login_request.email, login_request.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user.id,
                "email": user.email,
                "role": user.role.value
            },
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token, token_type="bearer")
    
    @staticmethod
    def get_current_user(token_data: TokenData) -> User:
        """
        Get current user from token data.
        
        Args:
            token_data: Decoded token data
            
        Returns:
            User object
            
        Raises:
            HTTPException: If user not found
        """
        user_data = db.get_user_by_id(token_data.user_id)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return User(**user_data)
    
    @staticmethod
    def change_password(user_id: str, old_password: str, new_password: str) -> bool:
        """
        Change user password.
        
        Args:
            user_id: User ID
            old_password: Current password
            new_password: New password
            
        Returns:
            True if successful
            
        Raises:
            HTTPException: If old password is incorrect
        """
        user_data = db.get_user_by_id(user_id)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not verify_password(old_password, user_data["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect old password"
            )
        
        hashed_password = get_password_hash(new_password)
        db.update_user(user_id, {"hashed_password": hashed_password})
        
        return True

    @staticmethod
    def forgot_password(email: str) -> None:
        """
        Initiate password reset process.
        """
        user_data = db.get_user_by_email(email)
        if not user_data:
            # Don't reveal if user exists
            return

        # Generate token
        token = str(uuid.uuid4())
        expires = datetime.utcnow() + timedelta(hours=1)

        # Update user
        db.update_user(user_data["id"], {
            "reset_token": token,
            "reset_token_expires": expires.isoformat()
        })

        # Mock email sending
        print(f"PASSWORD RESET LINK: http://localhost:5173/reset-password?token={token}")

    @staticmethod
    def reset_password(token: str, new_password: str) -> bool:
        """
        Reset password using token.
        """
        # Find user by token
        all_users = db.get_all_users()
        user = next((u for u in all_users if u.get("reset_token") == token), None)

        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired token")

        # Check expiration
        expires_str = user.get("reset_token_expires")
        if not expires_str:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        
        expires = datetime.fromisoformat(expires_str)
        if datetime.utcnow() > expires:
            raise HTTPException(status_code=400, detail="Token expired")

        # Update password and clear token
        hashed_password = get_password_hash(new_password)
        db.update_user(user["id"], {
            "hashed_password": hashed_password,
            "reset_token": None,
            "reset_token_expires": None
        })
        
        return True
