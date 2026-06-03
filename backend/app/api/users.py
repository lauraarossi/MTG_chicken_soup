from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, GoogleAuthRequest,
    UpdateProfileRequest, TokenResponse, UserResponse,
)
from app.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=body.email, name=body.name, hashed_password=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id),
        user_id=user.id, email=user.email, name=user.name, avatar=user.avatar,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(user.id),
        user_id=user.id, email=user.email, name=user.name, avatar=user.avatar,
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.google_id == body.google_id))
    if not user:
        user = await db.scalar(select(User).where(User.email == body.email))
        if user:
            user.google_id = body.google_id
            if not user.name:
                user.name = body.name
            if not user.avatar and body.avatar:
                user.avatar = body.avatar
        else:
            user = User(email=body.email, name=body.name, google_id=body.google_id, avatar=body.avatar)
            db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id),
        user_id=user.id, email=user.email, name=user.name, avatar=user.avatar,
    )


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id, email=user.email, name=user.name, avatar=user.avatar,
        has_password=bool(user.hashed_password),
    )


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Email or password change requires current password
    if (body.email or body.new_password) and not body.current_password:
        raise HTTPException(status_code=400, detail="Current password required to change email or password")

    if body.current_password:
        if not user.hashed_password or not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

    if body.email and body.email != user.email:
        taken = await db.scalar(select(User).where(User.email == body.email))
        if taken:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = body.email

    if body.name is not None:
        user.name = body.name

    if body.new_password:
        user.hashed_password = hash_password(body.new_password)

    if body.avatar is not None:
        user.avatar = body.avatar

    await db.commit()
    await db.refresh(user)
    return UserResponse(
        id=user.id, email=user.email, name=user.name, avatar=user.avatar,
        has_password=bool(user.hashed_password),
    )
