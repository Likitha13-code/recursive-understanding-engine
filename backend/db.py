from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

_client = None

def get_db():
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        if "mongodb+srv" in uri:
            _client = MongoClient(uri, tls=True, tlsAllowInvalidCertificates=True)
        else:
            _client = MongoClient(uri)
    return _client["rue_db"]
