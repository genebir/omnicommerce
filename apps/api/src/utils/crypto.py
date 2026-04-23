"""Fernet 대칭 암호화 유틸리티 — 채널 자격증명 등 민감 데이터 암호화에 사용."""

from cryptography.fernet import Fernet

from src.core.settings import settings


def _fernet() -> Fernet:
    return Fernet(settings.FERNET_KEY.encode())


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode()).decode()
