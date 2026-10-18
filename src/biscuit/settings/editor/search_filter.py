from __future__ import annotations

from typing import Any, List, Optional


class SettingsSearchFilter:
    """Helper for evaluating and matching settings items against a search query."""

    @staticmethod
    def matches(name: str, description: Optional[str], term: str) -> bool:
        if not term:
            return True
        term = term.strip().lower()
        if term in (name or "").lower():
            return True
        if description and term in str(description).lower():
            return True
        return False

    @staticmethod
    def filter_items(items: List[Any], term: str) -> List[Any]:
        term = term.strip().lower()
        if not term:
            return list(items)
        return [
            item for item in items
            if SettingsSearchFilter.matches(
                getattr(item, "name", ""),
                getattr(item, "description", None),
                term
            )
        ]
