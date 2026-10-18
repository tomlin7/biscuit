from __future__ import annotations

from typing import Any, Dict, List, Optional


class ExtensionCategory:
    ALL = "All"
    THEMES = "Themes"
    LANGUAGE_SERVERS = "Language Servers"
    FORMATTERS = "Formatters"
    AI = "AI"
    DEBUGGERS = "Debuggers"

    CATEGORIES = [ALL, THEMES, LANGUAGE_SERVERS, FORMATTERS, AI, DEBUGGERS]


class ExtensionCategoryFilter:
    """Filters extension items by category or keyword tags."""

    def __init__(self, active_category: str = ExtensionCategory.ALL):
        self.active_category = active_category

    def matches(self, ext_data: Dict[str, Any], category: Optional[str] = None) -> bool:
        cat = category or self.active_category
        if cat == ExtensionCategory.ALL or not cat:
            return True

        target = cat.lower()
        tags = [str(t).lower() for t in ext_data.get("tags", [])]
        category_field = str(ext_data.get("category", "")).lower()
        description = str(ext_data.get("description", "")).lower()

        if target == "themes":
            return "theme" in tags or "theme" in category_field or "theme" in description
        elif target == "language servers":
            return "lsp" in tags or "language-server" in tags or "lsp" in description or "language server" in category_field
        elif target == "formatters":
            return "formatter" in tags or "formatting" in tags or "formatter" in category_field
        elif target == "ai":
            return "ai" in tags or "llm" in tags or "assistant" in tags or "ai" in category_field
        elif target == "debuggers":
            return "debugger" in tags or "dap" in tags or "debug" in tags or "debugger" in category_field

        return target in category_field or target in tags

    def filter_list(self, extensions: List[Dict[str, Any]], category: Optional[str] = None) -> List[Dict[str, Any]]:
        return [ext for ext in extensions if self.matches(ext, category)]
