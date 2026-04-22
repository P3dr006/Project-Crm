import bcrypt
import os
import jwt
from datetime import datetime, timedelta, timezone

def hash_password(password: str) -> str:
    """Encodes a plain text password into a secure bcrypt hash."""
    # Converts string to bytes
    pwd_bytes = password.encode('utf-8')
    # Generates salt and hashes
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    # Returns as string to save in the database
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if the provided password matches the stored hash."""
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise ValueError("ERRO CRÍTICO: SECRET_KEY não encontrada nas variáveis de ambiente! Verifique seu arquivo .env.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict):
    """Gera um crachá criptografado (JWT) com os dados do usuário e validade."""
    to_encode = data.copy()
    
    # Set the date and time when the badge expires.
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Manufacturing the sealed token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
