from sqlmodel import Session, create_engine

from ..config import config
from .logger import Logger

log = Logger.get_logger(__name__)


# Create the database engine
engine = create_engine(
    url=config.database.url,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=100,
    max_overflow=50,
)


class DatabaseContextManager:
    def __init__(self):
        log.debug("Creating new database session")
        self.db = Session(engine)

    def __enter__(self):
        log.debug("Entering database session")
        return self.db

    def __exit__(self, exc_type, exc_value, traceback):
        log.debug(
            f"Exiting database session with exc_type={exc_type}, exc_value={exc_value}"
        )
        log.debug(f"Traceback: {traceback}")
        self.db.close()


def get_db():
    with DatabaseContextManager() as db_session:
        yield db_session
