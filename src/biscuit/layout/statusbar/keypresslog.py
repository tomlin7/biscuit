"""Keypress display for the Biscuit status bar.

When enabled (e.g. for streaming), shows each key combination pressed
as a pill in the status bar that auto-clears after a short delay.

Supports:
  - Regular characters: 'a', '1', '$', etc.
  - Modifier combos:    'Ctrl+S', 'Ctrl+Shift+P', 'Alt+F4'
  - Special keys:       'Esc', 'Enter', 'Tab', '⌫', '⌦', arrows, F-keys
  - Vim sequences:      shows the pending command buffer (e.g. 'd', then 'dd')
"""

from __future__ import annotations

import tkinter as tk
import typing

if typing.TYPE_CHECKING:
    from biscuit.layout.statusbar.statusbar import Statusbar

# Keys that have no printable character and need a display name
_SPECIAL = {
    "Escape": "Esc",
    "Return": "Enter",
    "KP_Enter": "Enter",
    "Tab": "Tab",
    "BackSpace": "⌫",
    "Delete": "⌦",
    "space": "Space",
    "Up": "↑",
    "Down": "↓",
    "Left": "←",
    "Right": "→",
    "Home": "Home",
    "End": "End",
    "Prior": "PgUp",
    "Next": "PgDn",
    "Insert": "Ins",
}

# Modifier state bit-masks (Tk event.state)
_MOD_CTRL = 0x4
_MOD_ALT = 0x8
_MOD_SHIFT = 0x1


def _resolve_key_label(keysym: str, char: str) -> str:
    """Return the display label for the key portion (no modifiers)."""
    if keysym in _SPECIAL:
        return _SPECIAL[keysym]
    if len(keysym) == 1 and keysym.isprintable():
        return char if char and char.isprintable() else keysym
    if keysym.startswith("F") and keysym[1:].isdigit():
        return keysym  # F1-F12
    if char and char.isprintable():
        return char
    return keysym  # fallback: raw name


def _is_modifier_only(keysym: str) -> bool:
    """Return True if this key event is a bare modifier press (no label needed)."""
    return keysym in (
        "Shift_L",
        "Shift_R",
        "shift_L",
        "shift_R",
        "Control_L",
        "Control_R",
        "Alt_L",
        "Alt_R",
        "Meta_L",
        "Meta_R",
        "Super_L",
        "Super_R",
        "Caps_Lock",
        "Num_Lock",
        "Scroll_Lock",
    )


def _format_key(event: tk.Event) -> str:
    """Turn a tkinter KeyPress event into a human-readable label."""
    if _is_modifier_only(event.keysym):
        return ""

    state = event.state
    parts = []
    if state & _MOD_CTRL:
        parts.append("Ctrl")
    if state & _MOD_ALT:
        parts.append("Alt")
    if (state & _MOD_SHIFT) and not (event.char and event.char.isprintable()):
        parts.insert(0, "Shift")

    parts.append(_resolve_key_label(event.keysym, event.char))
    return "+".join(parts)


class KeypressDisplay:
    """A label inside the status bar that shows the most recently pressed key.

    Enabled/disabled via :meth:`enable` / :meth:`disable`.
    When enabled it binds a ``<KeyPress>`` handler to the root Tk window so
    every key press anywhere in the app is captured.
    """

    _CLEAR_DELAY_MS = 1500

    def __init__(self, statusbar: "Statusbar") -> None:
        self._sb = statusbar
        self.base = statusbar.base
        self._enabled = False
        self._after_id = None

        # The visible pill label
        self._label = tk.Label(
            statusbar,
            text="",
            bg="#2a2a3a",  # slightly distinct dark background
            fg="#e0e0ff",
            # font=(self.base.settings.uifont[0], self.base.settings.uifont[1]),
            padx=8,
            pady=1,
            relief=tk.FLAT,
            bd=0,
        )

    # ------------------------------------------------------------------
    # Enable / disable
    # ------------------------------------------------------------------

    def enable(self) -> None:
        """Show the display and start capturing key events."""
        if self._enabled:
            return
        self._enabled = True
        self._label.pack(side=tk.RIGHT, padx=(0, 6), pady=2)
        # Bind to root so ALL key events are captured
        self.base.bind("<KeyPress>", self._on_key, add=True)

    def disable(self) -> None:
        """Hide the display and stop capturing."""
        if not self._enabled:
            return
        self._enabled = False
        try:
            self.base.unbind("<KeyPress>")
        except Exception:
            pass
        self._cancel_timer()
        self._label.pack_forget()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _on_key(self, event: tk.Event) -> None:
        label = _format_key(event)
        if not label:
            return
        self._show(label)

    def _show(self, text: str) -> None:
        self._cancel_timer()
        self._label.configure(text=f"  {text}  ")
        self._after_id = self.base.after(self._CLEAR_DELAY_MS, self._clear)

    def _clear(self) -> None:
        self._after_id = None
        self._label.configure(text="")

    def _cancel_timer(self) -> None:
        if self._after_id is not None:
            try:
                self.base.after_cancel(self._after_id)
            except Exception:
                pass
            self._after_id = None
