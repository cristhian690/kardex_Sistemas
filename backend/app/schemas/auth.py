from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioOut(BaseModel):
    id: int
    username: str
    nombre_completo: Optional[str] = None
    rol: str
    activo: bool
    ultimo_login: Optional[datetime] = None

    class Config:
        from_attributes = True