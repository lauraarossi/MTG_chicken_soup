from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    google_id: str
    email: str
    name: str | None = None
    avatar: str | None = None  # picture URL from Google


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    current_password: str | None = None  # required when changing email or password
    new_password: str | None = None
    avatar: str | None = None  # base64 data URL


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    name: str | None
    avatar: str | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: str | None
    avatar: str | None
    has_password: bool
