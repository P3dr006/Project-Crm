import bcrypt

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