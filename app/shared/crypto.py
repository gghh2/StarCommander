from cryptography.fernet import Fernet
import keyring

SERVICE_NAME = "StarCommander"
KEY_NAME = "bot_token_encryption_key"


def get_or_create_key() -> bytes:
    key = keyring.get_password(SERVICE_NAME, KEY_NAME)

    if key is None:
        key = Fernet.generate_key().decode()
        keyring.set_password(SERVICE_NAME, KEY_NAME, key)

    return key.encode()


def get_fernet() -> Fernet:
    return Fernet(get_or_create_key())


def encrypt_token(token: str) -> str:
    fernet = get_fernet()
    encrypted_token = fernet.encrypt(token.encode())
    return encrypted_token.decode()


def decrypt_token(encrypted_token: str) -> str:
    fernet = get_fernet()
    decrypted_token = fernet.decrypt(encrypted_token.encode())
    return decrypted_token.decode()
