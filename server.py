#!/usr/bin/env python3
"""
Portfolio CMS — local development server (Python stdlib only).

Mirrors the Vercel serverless API so the same frontend works locally:
  /              -> site/index.html
  /admin         -> admin/index.html
  /api/login     -> POST {username,password} -> {token}
  /api/content   -> GET content, PUT content (auth)
  /api/upload    -> POST multipart (auth)
  /api/files     -> GET list (auth), DELETE ?name= (auth)
  /uploads/<f>   -> uploaded files (site/uploads)

Run:  python server.py    (site: http://127.0.0.1:8437  admin: /admin)
"""
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, "data.json")
UPLOADS_DIR = os.path.join(ROOT, "site", "uploads")
DATA_LOCK = threading.Lock()

# ------------------------------------------------------------- config ---
def load_config():
    cfg_path = os.path.join(ROOT, "server.config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, "r", encoding="utf-8") as f:
            return json.load(f)
    cfg = {
        "username": "admin",
        "password": secrets.token_urlsafe(9),
        "secret": secrets.token_hex(24),
    }
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    print("=" * 60)
    print("First run: admin account created -> server.config.json")
    print(f"  username: {cfg['username']}")
    print(f"  password: {cfg['password']}")
    print("(change values in server.config.json anytime, then restart)")
    print("=" * 60)
    return cfg

CONFIG = load_config()

# ------------------------------------------------------------- tokens ---
def sign(payload: str) -> str:
    return hmac.new(CONFIG["secret"].encode(), payload.encode(), hashlib.sha256).hexdigest()

def issue_token(username: str) -> str:
    import base64
    payload = base64.urlsafe_b64encode(
        json.dumps({"u": username, "exp": int(secrets.randbits(0) or __import__("time").time() * 1000) + 14 * 86400000})
        .encode()
    ).decode().rstrip("=")
    return payload + "." + sign(payload)

def check_token(token: str) -> bool:
    try:
        import base64
        payload, sig = token.split(".", 1)
        expected = sign(payload)
        if not hmac.compare_digest(sig, expected):
            return False
        pad = "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload + pad))
        return data["exp"] > __import__("time").time() * 1000
    except Exception:
        return False

# ------------------------------------------------------------ helpers ---
def load_content():
    with DATA_LOCK:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

def save_content(data):
    with DATA_LOCK:
        tmp = DATA_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DATA_FILE)

def safe_filename(name):
    name = os.path.basename(name or "file")
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return name[:80] or "file"

def parse_multipart(body: bytes, content_type: str):
    m = re.search(r'boundary="?([^";]+)"?', content_type)
    if not m:
        return {}
    boundary = b"--" + m.group(1).encode()
    parts = {}
    idx = body.find(boundary)
    while idx != -1:
        idx += len(boundary)
        if body[idx:idx + 2] == b"--":
            break
        idx += 2
        head_end = body.find(b"\r\n\r\n", idx)
        if head_end == -1:
            break
        head = body[idx:head_end].decode("utf-8", "replace")
        nxt = body.find(boundary, head_end + 4)
        data = body[head_end + 4 : nxt - 2] if nxt != -1 else body[head_end + 4 :]
        name_m = re.search(r'name="([^"]*)"', head)
        file_m = re.search(r'filename="([^"]*)"', head)
        if name_m:
            parts[name_m.group(1)] = {"filename": file_m.group(1) if file_m else "", "data": data}
        idx = nxt
    return parts

def save_upload(filename, data):
    safe = safe_filename(filename)
    base, ext = os.path.splitext(safe)
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    candidate, i = safe, 1
    while os.path.exists(os.path.join(UPLOADS_DIR, candidate)):
        candidate = f"{base}-{i}{ext}"
        i += 1
    with open(os.path.join(UPLOADS_DIR, candidate), "wb") as f:
        f.write(data)
    return {"url": "uploads/" + candidate, "name": candidate}

# ------------------------------------------------------------ handler ---
class Handler(BaseHTTPRequestHandler):
    server_version = "PortfolioCMS/1.1"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print("%s %s" % (self.address_string(), fmt % args))

    def send_json(self, obj, status=HTTPStatus.OK):
        payload = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def send_file(self, path, status=HTTPStatus.OK):
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        try:
            with open(path, "rb") as f:
                data = f.read()
        except OSError:
            return self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        if path.endswith(".html"):
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length else b""

    def authorized(self):
        auth = self.headers.get("Authorization", "")
        return auth.startswith("Bearer ") and check_token(auth[7:])

    # ---- static ----
    def serve_static(self, path):
        if path == "/":
            return self.send_file(os.path.join(ROOT, "site", "index.html"))
        if path == "/admin":
            return self.send_file(os.path.join(ROOT, "admin", "index.html"))
        if path.startswith("/admin/"):
            base, rel = os.path.join(ROOT, "admin"), path[len("/admin/"):]
        else:
            base, rel = os.path.join(ROOT, "site"), path.lstrip("/")
        full = os.path.normpath(os.path.join(base, rel))
        if not full.startswith(os.path.normpath(base)) or not os.path.isfile(full):
            return self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
        return self.send_file(full)

    # ---- GET ----
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/content":
            return self.send_json(load_content())
        if url.path == "/api/files":
            if not self.authorized():
                return self.send_json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
            files = []
            if os.path.isdir(UPLOADS_DIR):
                for fn in sorted(os.listdir(UPLOADS_DIR)):
                    fp = os.path.join(UPLOADS_DIR, fn)
                    if os.path.isfile(fp):
                        files.append({"name": fn, "url": "uploads/" + fn, "size": os.path.getsize(fp)})
            return self.send_json({"files": files})
        return self.serve_static(url.path)

    # ---- POST ----
    def do_POST(self):
        url = urlparse(self.path)
        body = self.read_body()

        if url.path == "/api/login":
            try:
                creds = json.loads(body.decode("utf-8"))
            except ValueError:
                return self.send_json({"error": "bad request"}, HTTPStatus.BAD_REQUEST)
            if creds.get("username") == CONFIG["username"] and creds.get("password") == CONFIG["password"]:
                return self.send_json({"token": issue_token(creds["username"])})
            return self.send_json({"error": "invalid credentials"}, HTTPStatus.UNAUTHORIZED)

        if url.path == "/api/logout":
            return self.send_json({"ok": True})

        if url.path == "/api/upload":
            if not self.authorized():
                return self.send_json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
            parts = parse_multipart(body, self.headers.get("Content-Type", ""))
            file = parts.get("file")
            if not file or not file["data"]:
                return self.send_json({"error": "no file"}, HTTPStatus.BAD_REQUEST)
            return self.send_json(save_upload(file["filename"], file["data"]))

        return self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    # ---- PUT ----
    def do_PUT(self):
        url = urlparse(self.path)
        if url.path == "/api/content":
            if not self.authorized():
                return self.send_json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
            try:
                data = json.loads(self.read_body().decode("utf-8"))
            except ValueError:
                return self.send_json({"error": "invalid JSON"}, HTTPStatus.BAD_REQUEST)
            save_content(data)
            return self.send_json({"ok": True})
        return self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    # ---- DELETE ----
    def do_DELETE(self):
        url = urlparse(self.path)
        if url.path == "/api/files":
            if not self.authorized():
                return self.send_json({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
            name = safe_filename((parse_qs(url.query).get("name") or [""])[0])
            target = os.path.join(UPLOADS_DIR, name)
            if name and os.path.isfile(target):
                os.remove(target)
                return self.send_json({"ok": True})
            return self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
        return self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)


def main():
    port = int(os.environ.get("PORT", "8437"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Portfolio CMS:  site http://127.0.0.1:{port}/   |   admin http://127.0.0.1:{port}/admin")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
