from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db          # ajusta si tu get_db está en otra ruta
from app.models.usuario import Usuario
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    username = decode_token(token)
    if not username:
        raise cred_exc

    user = db.query(Usuario).filter(Usuario.username == username).first()
    if not user or not user.activo:
        raise cred_exc

    return user