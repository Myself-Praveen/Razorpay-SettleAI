"""
SettleAI — Abstract data source adapter.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class DataSourceAdapter(ABC):
    """Interchangeable adapter for data sources."""

    @abstractmethod
    async def stream_records(self) -> AsyncIterator[dict]:
        """Yield records one at a time."""
        ...

    @abstractmethod
    async def get_metadata(self) -> dict:
        """Return source metadata."""
        ...
