from sqlmodel import Session
from typing import Any


class Controller:
    def __init__(self, session: Session):
        self.session = session

    def sar(self, obj: Any) -> Any:
        """
        Save and refresh an object in the database session

        Args:
            obj (Any): The object to be saved and refreshed

        Returns:
            Any: The refreshed object
        """
        self.session.add(obj)
        self.session.commit()
        self.session.refresh(obj)
        return obj
