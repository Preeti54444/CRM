import http.server
import socketserver
from pathlib import Path

HOST = "127.0.0.1"
PORT = 3000

WEB_DIR = Path(__file__).resolve().parent

class FrontendRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def log_message(self, format, *args):
        # Keep the console output minimal.
        print(format % args)

if __name__ == "__main__":
    with socketserver.TCPServer((HOST, PORT), FrontendRequestHandler) as httpd:
        print(f"Serving frontend at http://{HOST}:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Shutting down frontend server")
            httpd.server_close()
