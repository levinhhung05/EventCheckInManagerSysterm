"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import LoginRequest, Token, User, PasswordChange, UserCreate, UserUpdate, PasswordResetRequest, PasswordResetConfirm
from app.services.auth_service import AuthService
from app.core.dependencies import get_current_active_user, get_current_super_admin_user
from app.core.security import get_password_hash
from app.storage.json_db import db

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(login_request: LoginRequest):
    """
    Login endpoint to authenticate user and return access token.

    Args:
        login_request: Login credentials

    Returns:
        JWT access token
    """
    return AuthService.login(login_request)


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information.

    Args:
        current_user: Current authenticated user

    Returns:
        User information
    """
    return current_user


@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_active_user)
):
    """
    Change current user's password.

    Args:
        password_change: Old and new passwords
        current_user: Current authenticated user

    Returns:
        Success message
    """
    AuthService.change_password(
        current_user.id,
        password_change.old_password,
        password_change.new_password
    )

    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """
    Initiate password reset process.
    """
    AuthService.forgot_password(request.email)
    return {"message": "If the email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """
    Reset password using token.
    """
    AuthService.reset_password(request.token, request.new_password)
    return {"message": "Password has been reset successfully."}


@router.post("/users", response_model=User)
async def create_user(
    user_create: UserCreate,
    current_user: User = Depends(get_current_super_admin_user)
):
    """
    Create a new user (Super Admin only).
    
    Args:
        user_create: User creation data
        current_user: Current super admin user
        
    Returns:
        Created user
    """
    # Check if email already exists
    existing_user = db.get_user_by_email(user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_data = user_create.model_dump()
    user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    user_data["is_active"] = True
    user_data["assigned_events"] = []
    
    created_user = db.create_user(user_data)
    
    return User(**created_user)


@router.get("/users", response_model=list[User])
async def list_users(
    current_user: User = Depends(get_current_super_admin_user)
):
    """
    List all users (Super Admin only).
    
    Args:
        current_user: Current super admin user
        
    Returns:
        List of users
    """
    users_data = db.get_all_users()
    return [User(**user) for user in users_data]


@router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_super_admin_user)
):
    """
    Update a user (Super Admin only).
    """
    existing_user = db.get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    
    # Check email uniqueness if email is being updated
    if "email" in update_data:
        email_check = db.get_user_by_email(update_data["email"])
        if email_check and email_check["id"] != user_id:
             raise HTTPException(status_code=400, detail="Email already registered")

    # Handle password update
    if "password" in update_data:
        if update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        else:
            update_data.pop("password") # Remove None/Empty if present

    updated_user = db.update_user(user_id, update_data)
    if not updated_user:
         raise HTTPException(status_code=404, detail="User not found")

    return User(**updated_user)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_super_admin_user)
):
    """
    Delete a user (Super Admin only).
    """
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    success = db.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}
