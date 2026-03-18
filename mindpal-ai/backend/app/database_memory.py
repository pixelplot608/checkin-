"""
In-memory database for running without MongoDB (e.g. no MongoDB installed).
Use USE_IN_MEMORY_DB=true in .env or set MONGODB_URI to skip real connection.
"""
import copy
import uuid
from datetime import datetime
from typing import Any


def _id():
    return str(uuid.uuid4())[:24]


def _match(doc: dict, query: dict) -> bool:
    for key, value in query.items():
        if key not in doc:
            return False
        if isinstance(value, dict) and "$gte" in value:
            if doc[key] < value["$gte"]:
                return False
        elif doc[key] != value:
            return False
    return True


class _AsyncCursor:
    def __init__(self, items: list, query: dict, sort_key: str | None, sort_dir: int, limit: int):
        self._items = [copy.deepcopy(d) for d in items if _match(d, query)]
        if sort_key:
            self._items.sort(key=lambda d: d.get(sort_key) or "", reverse=(sort_dir == -1))
        if limit > 0:
            self._items = self._items[:limit]
        self._index = 0

    async def __anext__(self) -> dict:
        if self._index >= len(self._items):
            raise StopAsyncIteration
        d = self._items[self._index]
        self._index += 1
        return d


class _MemoryCollection:
    def __init__(self, name: str, store: dict):
        self._name = name
        self._store = store

    def _list(self) -> list:
        if self._name not in self._store:
            self._store[self._name] = []
        return self._store[self._name]

    async def find_one(self, query: dict) -> dict | None:
        for doc in self._list():
            if _match(doc, query):
                return copy.deepcopy(doc)
        return None

    async def insert_one(self, doc: dict) -> Any:
        doc = copy.deepcopy(doc)
        doc["_id"] = _id()
        self._list().append(doc)
        return type("InsertResult", (), {"inserted_id": doc["_id"]})()

    async def update_one(self, query: dict, update: dict, *, upsert: bool = False) -> Any:
        for doc in self._list():
            if _match(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1})()
        if upsert and "$set" in update:
            new_doc = copy.deepcopy(update["$set"])
            new_doc["_id"] = _id()
            self._list().append(new_doc)
        return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0})()

    def find(self, query: dict | None = None) -> "_MemoryCursor":
        return _MemoryCursor(self._list(), query or {})

    async def count_documents(self, query: dict) -> int:
        return sum(1 for d in self._list() if _match(d, query))


class _MemoryCursor:
    def __init__(self, items: list, query: dict):
        self._items = items
        self._query = query
        self._sort_key = None
        self._sort_dir = 1
        self._limit = 0

    def sort(self, key_or_list: str | list, direction: int = 1) -> "_MemoryCursor":
        if isinstance(key_or_list, list):
            key_or_list, direction = key_or_list[0], key_or_list[1] if len(key_or_list) > 1 else 1
        self._sort_key = key_or_list
        self._sort_dir = direction
        return self

    def limit(self, n: int) -> "_MemoryCursor":
        self._limit = n
        return self

    def __aiter__(self) -> "_AsyncCursor":
        return _AsyncCursor(self._items, self._query, self._sort_key, self._sort_dir, self._limit)

    async def to_list(self, length: int = 0) -> list:
        """Motor-compatible: return list of docs (e.g. length=1 for find_one replacement)."""
        out = []
        async for doc in self:
            out.append(doc)
            if length and len(out) >= length:
                break
        return out


# Global in-memory store (one per process)
_MEMORY_STORE: dict = {}


class MemoryDatabase:
    """Mimics Motor database interface for in-memory use."""

    def __init__(self, store: dict | None = None):
        self._store = store if store is not None else _MEMORY_STORE

    def __getattr__(self, name: str) -> _MemoryCollection:
        return _MemoryCollection(name, self._store)


def get_memory_db() -> MemoryDatabase:
    return MemoryDatabase()
