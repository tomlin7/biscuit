"""Vim mode emulation for Biscuit text editor.

Provides Normal, Insert, Visual, and Command modes with authentic
Vim keybindings. Toggle via command palette or Ctrl+Alt+V.
"""

from .vim import VimMode

__all__ = ["VimMode"]
