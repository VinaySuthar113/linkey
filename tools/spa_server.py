import http.server, socketserver, os, posixpath, urllib.parse, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "5200"))

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = urllib.parse.urlparse(path).path
        fs = super().translate_path(path)
        if os.path.isdir(fs):
            return os.path.join(fs, "index.html")
        if not os.path.exists(fs) and "." not in posixpath.basename(p):
            return os.path.join(ROOT, "index.html")
        return fs

    def end_headers(self):
        # Development server: never let a stale script survive a refresh.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *a):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    httpd.serve_forever()
