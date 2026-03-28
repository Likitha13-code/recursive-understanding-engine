from pymongo import MongoClient
from dotenv import load_dotenv
import ssl
import os

load_dotenv()

_client = None

def get_db():
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        if "mongodb+srv" in uri:
            ctx = ssl.SSLContext(ssl.PROTOCOL_TLS)
            ctx.verify_mode = ssl.CERT_NONE
            ctx.check_hostname = False
            ctx.minimum_version = ssl.TLSVersion.TLSv1_2
            # Allow legacy renegotiation needed by some Atlas configurations
            ctx.options |= getattr(ssl, 'OP_LEGACY_SERVER_CONNECT', 0)
            _client = MongoClient(uri, ssl_context=ctx)
        else:
            _client = MongoClient(uri)
    return _client["rue_db"]
