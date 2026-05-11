import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.core.security import hash_password


async def main():
    username = input("Username: ").strip()
    nombre   = input("Nombre completo: ").strip()
    password = input("Password: ").strip()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Usuario).where(Usuario.username == username))
        if result.scalar_one_or_none():
            print(f"❌ El usuario '{username}' ya existe.")
            return

        user = Usuario(
            username=username,
            nombre_completo=nombre,
            hashed_password=hash_password(password),
            rol="admin",
            activo=True,
        )
        db.add(user)
        await db.commit()
        print(f"✅ Usuario '{username}' creado correctamente.")


if __name__ == "__main__":
    asyncio.run(main())