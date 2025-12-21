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
