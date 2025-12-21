from backend.api import start_server

if __name__ == "__main__":
    # Start the backend server in the main thread
    # This is useful for development and debugging purposes (enable hot-reloading, etc.)
    start_server()
