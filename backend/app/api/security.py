from fastapi.security import OAuth2PasswordBearer

# Single shared OAuth2 scheme used across the entire backend.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")