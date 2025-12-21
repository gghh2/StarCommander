from backend.api import start_server
import subprocess
import os

if __name__ == "__main__":
    # Run migrations to update the database schema
    try:
        app_path = os.path.dirname(os.path.abspath(__file__))
        subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=app_path,
            check=True,
        )
        print("Alembic migrations applied successfully.")
    except Exception as e:
        print(f"Failed to apply Alembic migrations: {e}")
        raise

    # Start the backend server in the main thread
    # This is useful for development and debugging purposes (enable hot-reloading, etc.)
    start_server()
