from __future__ import annotations

from typing import List, Optional


DEFAULT_FALLBACK_FONTS = [
    "Consolas",
    "Courier New",
    "DejaVu Sans Mono",
    "Fira Code",
    "JetBrains Mono",
    "Lucida Console",
    "Segoe UI",
]


class FontManager:
    """Manages system and fallback font discovery and configuration."""

    @staticmethod
    def get_system_font_families() -> List[str]:
        try:
            import tkinter.font as tkfont
            import tkinter as tk
            # Only query if a root window exists to avoid headless crashes
            root = tk._default_root
            if root:
                fonts = list(set(tkfont.families(root)))
                fonts.sort()
                return [f for f in fonts if not f.startswith("@")]
        except Exception:
            pass
        return list(DEFAULT_FALLBACK_FONTS)

    @staticmethod
    def is_font_available(font_family: str, available_fonts: Optional[List[str]] = None) -> bool:
        fonts = available_fonts or FontManager.get_system_font_families()
        return font_family.lower() in [f.lower() for f in fonts]
