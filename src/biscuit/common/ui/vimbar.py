"""Vim command-line bar.

A thin bar that appears above the status bar when Vim mode enters
Command mode (:). Also shows Vim operation messages (e.g. '1 line yanked')
that auto-dismiss after a short timeout.
Accepts :w, :q, :wq, and :<number> (goto line).
"""

from __future__ import annotations

import tkinter as tk


class VimBar(tk.Frame):
    """Vim-style command-line bar rendered at the bottom of the window.

    Positioned above the status bar (hidden by default).
    - VimMode calls show()/hide() for command-mode input.
    - VimMode calls show_message() for ephemeral operation messages.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        # Traverse master chain to find App (which sets self.base = self)
        node = master
        while node is not None:
            if hasattr(node, "base"):
                self.base = node.base
                break
            node = getattr(node, "master", None)
        else:
            self.base = master  # fallback: assume master IS the App
        self._visible = False
        self._msg_after_id = None  # pending auto-hide timer

        # Theming
        bg = self.base.theme.layout.statusbar.background
        fg = self.base.theme.layout.statusbar.button.foreground
        self.configure(bg=bg, height=26)

        # --- Command-input row (: prompt + entry) --------------------------
        self._cmd_frame = tk.Frame(self, bg=bg)

        self._prompt = tk.Label(
            self._cmd_frame,
            text=":",
            bg=bg,
            fg=fg,
            font=self.base.settings.uifont,
            padx=6,
        )
        self._prompt.pack(side=tk.LEFT)

        self._entry = tk.Entry(
            self._cmd_frame,
            bg=bg,
            fg=fg,
            insertbackground=fg,
            relief=tk.FLAT,
            highlightthickness=0,
            font=self.base.settings.uifont,
            bd=0,
        )
        self._entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self._entry.bind("<Return>", self._on_submit)
        self._entry.bind("<Escape>", self._on_escape)
        self._entry.bind("<KP_Enter>", self._on_submit)

        # --- Message label (ephemeral vim operation messages) ---------------
        self._msg_label = tk.Label(
            self,
            text="",
            bg=bg,
            fg=fg,
            font=self.base.settings.uifont,
            anchor=tk.W,
            padx=8,
        )

    # ------------------------------------------------------------------
    # Visibility — command mode
    # ------------------------------------------------------------------

    def show(self) -> None:
        """Show the command bar (: prompt) and focus the entry."""
        self._cancel_msg_timer()
        self._msg_label.pack_forget()
        if not self._visible:
            self._visible = True
            self._entry.delete(0, tk.END)
            self._pack_above_statusbar()
        self._cmd_frame.pack(fill=tk.X, expand=True)
        self._entry.focus_set()

    def hide(self) -> None:
        """Hide the command bar and return focus to the active editor."""
        if self._visible:
            self._visible = False
            self._cmd_frame.pack_forget()
            self.pack_forget()
        self._return_focus()

    # ------------------------------------------------------------------
    # Ephemeral operation messages (e.g. "1 line yanked")
    # ------------------------------------------------------------------

    def show_message(self, msg: str, timeout_ms: int = 2000) -> None:
        """Display a temporary Vim-style operation message.

        The bar appears, shows *msg*, then auto-hides after *timeout_ms*.
        Works independently of command mode.
        """
        self._cancel_msg_timer()

        # Don't cover an active command input
        if self._visible:
            return

        fg = self.base.theme.layout.statusbar.button.foreground
        self._msg_label.configure(text=msg, fg=fg)
        self._cmd_frame.pack_forget()
        self._pack_above_statusbar()
        self._msg_label.pack(fill=tk.X, expand=True)

        self._msg_after_id = self.after(timeout_ms, self._hide_message)

    def _hide_message(self) -> None:
        """Auto-hide the message label and remove the bar."""
        self._msg_after_id = None
        self._msg_label.pack_forget()
        if not self._visible:
            self.pack_forget()
        self._return_focus()

    def _cancel_msg_timer(self) -> None:
        if self._msg_after_id is not None:
            try:
                self.after_cancel(self._msg_after_id)
            except Exception:
                pass
            self._msg_after_id = None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _pack_above_statusbar(self) -> None:
        """Pack this bar above the status bar in the same container."""
        try:
            self.base.statusbar.pack_forget()
            self.pack(fill=tk.X)
            self.base.statusbar.pack()
        except Exception:
            self.pack(fill=tk.X)

    def _return_focus(self) -> None:
        """Return keyboard focus to the active editor."""
        try:
            editor = self.base.editorsmanager.active_editor
            if editor and editor.content and editor.content.editable:
                editor.content.text.focus_set()
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Command dispatch
    # ------------------------------------------------------------------

    def _on_escape(self, _: tk.Event) -> None:
        self.hide()
        # Tell VimMode to return to Normal
        try:
            editor = self.base.editorsmanager.active_editor
            if editor and editor.content and editor.content.editable:
                text = editor.content.text
                if text.vim:
                    from biscuit.editor.text.vim.vim import NORMAL
                    text.vim._set_mode(NORMAL)
        except Exception:
            pass

    def _on_submit(self, _: tk.Event) -> None:
        cmd = self._entry.get().strip()
        self.hide()
        self._dispatch(cmd)

    def _dispatch(self, cmd: str) -> None:
        """Parse and execute a Vim ex command."""
        if not cmd:
            return
        if self._dispatch_file_cmd(cmd):
            return
        if self._dispatch_goto(cmd):
            return
        # Unknown command — notify
        try:
            self.base.notifications.warning(f"Vim: unknown command ':{cmd}'")
        except Exception:
            pass

    def _dispatch_file_cmd(self, cmd: str) -> bool:
        """Handle :w, :q, :wq variants. Returns True if handled."""
        if cmd in ("wq", "wq!"):
            self.base.commands.save_file()
            self.base.commands.close_editor()
            return True
        if cmd in ("w", "w!"):
            self.base.commands.save_file()
            return True
        if cmd in ("q", "q!"):
            self.base.commands.close_editor()
            return True
        return False

    def _dispatch_goto(self, cmd: str) -> bool:
        """Handle :<number> goto-line. Returns True if handled."""
        if not cmd.lstrip("-").isdigit():
            return False
        try:
            line = int(cmd)
            editor = self.base.editorsmanager.active_editor
            if editor and editor.content and editor.content.editable:
                editor.content.text.goto_line(line)
        except Exception:
            pass
        return True
