"""Vim mode core state machine for the Biscuit text editor.

Manages the four Vim modes: NORMAL, INSERT, VISUAL, COMMAND.
Intercepts key events on the Text widget and dispatches to
motion helpers and operator functions.

Usage (called from Text widget):
    self.vim = VimMode(self)   # enable
    self.vim.disable()         # disable
"""

from __future__ import annotations

import tkinter as tk
import typing

from . import motion, operator

if typing.TYPE_CHECKING:
    from biscuit.editor.text.text import Text

# Mode constants
NORMAL = "NORMAL"
INSERT = "INSERT"
VISUAL = "VISUAL"
VISUAL_LINE = "VISUAL LINE"
COMMAND = "COMMAND"

# Sequences set up by Text.config_bindings that insert/delete text.
# These take Tk priority over the generic <KeyPress> binding, so they
# must be individually wrapped to respect the current Vim mode.
# Maps (sequence -> method_name_on_Text).
_CHAR_SEQ_METHODS: dict[str, str] = {
    "<Return>": "enter_key_events",
    "<Tab>": "tab_key_events",
    "<Shift-Tab>": "dedent_selection",
    "<BackSpace>": "remove_pair",
    "<parenleft>": "open_bracket",
    "<braceleft>": "open_bracket",
    "<bracketleft>": "open_bracket",
    "<parenright>": "close_bracket",
    "<braceright>": "close_bracket",
    "<bracketright>": "close_bracket",
    "<apostrophe>": "complete_pair",
    "<quotedbl>": "complete_pair",
}


class VimMode:
    """Vim modal editing state machine.

    Binds to the parent Text widget. In Normal/Visual mode ALL character
    input (including specific bindings like <parenleft>) is blocked.
    In Insert mode the original handlers are called through normally.
    """

    def __init__(self, text: "Text") -> None:
        self.text = text
        self.base = text.base
        self._mode: str = NORMAL
        # Pending command buffer (e.g., 'd', 'c', 'g')
        self._pending: str = ""
        # Visual mode anchor index
        self._visual_anchor: str = ""
        self._visual_line_anchor: int = 0

        # Set block cursor for Normal mode
        self.text.configure(blockcursor=True)

        # Generic KeyPress handler (letters, digits, symbols without specific bindings)
        self.text.bind("<KeyPress>", self._on_keypress, add=True)
        self.text.bind("<Button-1>", self._on_mouse_click, add=True)

        # Wrap specific char bindings so Normal/Visual modes block them
        self._setup_char_guards()

        self._set_mode(NORMAL)

    # ------------------------------------------------------------------
    # Mode management
    # ------------------------------------------------------------------

    def _set_mode(self, mode: str) -> None:
        self._mode = mode
        self._pending = ""
        self._apply_cursor_for_mode(mode)
        self._notify_statusbar(mode)
        self._apply_vimbar_for_mode(mode)

    def _apply_cursor_for_mode(self, mode: str) -> None:
        """Set block/line cursor based on mode."""
        self.text.configure(blockcursor=(mode != INSERT and mode != COMMAND))

    def _notify_statusbar(self, mode: str) -> None:
        """Update status bar mode label."""
        try:
            self.base.statusbar.set_vim_mode(mode)
        except Exception:
            pass

    def _apply_vimbar_for_mode(self, mode: str) -> None:
        """Show/hide the vim command bar."""
        try:
            if mode == COMMAND:
                self.base.vimbar.show()
            else:
                self.base.vimbar.hide()
        except Exception:
            pass

    def _vim_msg(self, msg: str) -> None:
        """Show a Vim-style ephemeral message in the VimBar."""
        try:
            self.base.vimbar.show_message(msg)
        except Exception:
            pass

    def disable(self) -> None:
        """Remove all Vim bindings and restore default cursor."""
        try:
            self.text.unbind("<KeyPress>")
            self.text.unbind("<Button-1>")
        except Exception:
            pass
        self._restore_char_bindings()
        self.text.configure(blockcursor=self.base.block_cursor)
        try:
            self.base.statusbar.clear_vim_mode()
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Specific-binding guards
    # ------------------------------------------------------------------

    def _setup_char_guards(self) -> None:
        """Replace specific char bindings with vim-mode-aware wrappers.

        In Tk, a specific binding like <parenleft> has higher priority
        than the generic <KeyPress>, so it fires INSTEAD of <KeyPress>.
        We must wrap each one to block input in non-INSERT modes.
        """
        for seq, method_name in _CHAR_SEQ_METHODS.items():
            original = getattr(self.text, method_name, None)
            if original is not None:
                self.text.bind(seq, self._make_guard(seq, original))

    def _restore_char_bindings(self) -> None:
        """Restore the original specific bindings when vim mode is disabled."""
        for seq, method_name in _CHAR_SEQ_METHODS.items():
            original = getattr(self.text, method_name, None)
            if original is not None:
                self.text.bind(seq, original)

    def _make_guard(self, seq: str, original):
        """Return a wrapper that blocks *seq* outside of INSERT mode.

        In INSERT mode the original handler is called through unchanged.
        In NORMAL mode some keys have special Vim meanings (BackSpace → h,
        Return → j). In VISUAL modes all char-inserting keys are blocked.
        """
        def guard(event: tk.Event) -> str | None:
            if self._mode == INSERT:
                return original(event)  # normal editing
            # Normal-mode special motions
            if self._mode == NORMAL:
                if seq == "<BackSpace>":
                    self.text.mark_set(tk.INSERT, motion.move_left(self.text))
                    self.text.see(tk.INSERT)
                    return "break"
                if seq == "<Return>":
                    self.text.mark_set(tk.INSERT, motion.move_down(self.text))
                    self.text.see(tk.INSERT)
                    return "break"
            # All other modes / sequences: block
            return "break"
        return guard

    # ------------------------------------------------------------------
    # Mouse support
    # ------------------------------------------------------------------

    def _on_mouse_click(self, event: tk.Event) -> None:
        """In VISUAL modes, extend selection to click position."""
        if self._mode in (VISUAL, VISUAL_LINE):
            # Let the default click move the cursor first, then extend selection
            self.text.after_idle(self._update_visual_selection)

    # ------------------------------------------------------------------
    # Master key dispatcher
    # ------------------------------------------------------------------

    def _on_keypress(self, event: tk.Event) -> str | None:
        keysym = event.keysym
        char = event.char

        if self._mode == INSERT:
            return self._handle_insert(keysym, char, event)
        elif self._mode == NORMAL:
            return self._handle_normal(keysym, char, event)
        elif self._mode in (VISUAL, VISUAL_LINE):
            return self._handle_visual(keysym, char, event)
        elif self._mode == COMMAND:
            # Command bar handles its own input; just catch Escape here
            if keysym == "Escape":
                self._set_mode(NORMAL)
                return "break"
        return None

    # ------------------------------------------------------------------
    # INSERT mode
    # ------------------------------------------------------------------

    def _handle_insert(self, keysym: str, char: str, event: tk.Event) -> str | None:
        if keysym == "Escape":
            # Move cursor left one (Vim moves back when exiting insert)
            idx = self.text.index(tk.INSERT)
            new_idx = motion.move_left(self.text)
            if new_idx != idx:
                self.text.mark_set(tk.INSERT, new_idx)
            self._set_mode(NORMAL)
            return "break"
        # All other keys: let the text widget handle normally
        return None

    # ------------------------------------------------------------------
    # NORMAL mode
    # ------------------------------------------------------------------

    def _handle_normal(self, keysym: str, char: str, event: tk.Event) -> str | None:  # noqa: C901
        """Dispatch Normal-mode key. Returns 'break' to suppress insertion."""

        # --- Modifier-key-only events (pass through) ---
        if keysym in (
            "Control_L", "Control_R", "Alt_L", "Alt_R",
            "Shift_L", "Shift_R", "Meta_L", "Meta_R",
            "Super_L", "Super_R", "Caps_Lock", "Num_Lock",
        ):
            return None

        # --- Ctrl combos that should still work in Normal mode ---
        if event.state & 0x4:  # Control key held
            if keysym == "r":
                self.text.stack_redo()
                return "break"
            if keysym == "f":
                self.text.open_find_replace()
                return "break"
            # All other ctrl combos: pass through (save, quit, etc.)
            return None

        # ----------------------------------------------------------
        # Pending two-char sequences: 'd', 'c', 'g' operators
        # ----------------------------------------------------------
        if self._pending:
            result = self._handle_pending(keysym, char)
            return "break" if result is not None else "break"

        # ----------------------------------------------------------
        # Motion keys
        # ----------------------------------------------------------
        match char:
            case "h":
                self.text.mark_set(tk.INSERT, motion.move_left(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "l":
                self.text.mark_set(tk.INSERT, motion.move_right(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "k":
                self.text.mark_set(tk.INSERT, motion.move_up(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "j":
                self.text.mark_set(tk.INSERT, motion.move_down(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "w":
                self.text.mark_set(tk.INSERT, motion.word_start_next(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "b":
                self.text.mark_set(tk.INSERT, motion.word_start_prev(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "e":
                self.text.mark_set(tk.INSERT, motion.word_end(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "0":
                self.text.mark_set(tk.INSERT, motion.get_line_start(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "$":
                self.text.mark_set(tk.INSERT, motion.get_line_end(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "^":
                self.text.mark_set(tk.INSERT, motion.get_first_nonblank(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "G":
                last = int(self.text.index(tk.END).split(".")[0]) - 1
                self.text.mark_set(tk.INSERT, f"{last}.0")
                self.text.see(tk.INSERT)
                return "break"

        # keysym-based movements
        match keysym:
            case "Up":
                self.text.mark_set(tk.INSERT, motion.move_up(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "Down":
                self.text.mark_set(tk.INSERT, motion.move_down(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "Left":
                self.text.mark_set(tk.INSERT, motion.move_left(self.text))
                self.text.see(tk.INSERT)
                return "break"
            case "Right":
                self.text.mark_set(tk.INSERT, motion.move_right(self.text))
                self.text.see(tk.INSERT)
                return "break"

        # ----------------------------------------------------------
        # Insert-mode entry commands
        # ----------------------------------------------------------
        match char:
            case "i":
                self._set_mode(INSERT)
                return "break"
            case "I":
                self.text.mark_set(tk.INSERT, motion.get_first_nonblank(self.text))
                self._set_mode(INSERT)
                return "break"
            case "a":
                new_idx = motion.move_right(self.text)
                self.text.mark_set(tk.INSERT, new_idx)
                self._set_mode(INSERT)
                return "break"
            case "A":
                self.text.mark_set(tk.INSERT, motion.get_line_end(self.text))
                self._set_mode(INSERT)
                return "break"
            case "o":
                line = int(self.text.index(tk.INSERT).split(".")[0])
                self.text.insert(f"{line}.end", "\n")
                self.text.mark_set(tk.INSERT, f"{line + 1}.0")
                self.text.see(tk.INSERT)
                self._set_mode(INSERT)
                return "break"
            case "O":
                line = int(self.text.index(tk.INSERT).split(".")[0])
                self.text.insert(f"{line}.0", "\n")
                self.text.mark_set(tk.INSERT, f"{line}.0")
                self.text.see(tk.INSERT)
                self._set_mode(INSERT)
                return "break"

        # ----------------------------------------------------------
        # Visual mode entry
        # ----------------------------------------------------------
        if char == "v":
            self._visual_anchor = self.text.index(tk.INSERT)
            self._update_visual_selection()
            self._set_mode(VISUAL)
            return "break"

        if char == "V":
            self._visual_anchor = self.text.index(tk.INSERT)
            self._visual_line_anchor = int(self._visual_anchor.split(".")[0])
            self._update_visual_line_selection()
            self._set_mode(VISUAL_LINE)
            return "break"

        # ----------------------------------------------------------
        # Operators (first char of two-char sequences)
        # ----------------------------------------------------------
        if char in ("d", "c", "g", "y"):
            self._pending = char
            return "break"

        # ----------------------------------------------------------
        # Single-char actions
        # ----------------------------------------------------------
        match char:
            case "x":
                operator.delete_char(self.text)
                return "break"
            case "p":
                operator.paste_after(self.text)
                self.text.see(tk.INSERT)
                return "break"
            case "P":
                operator.paste_before(self.text)
                self.text.see(tk.INSERT)
                return "break"
            case "u":
                self.text.stack_undo()
                return "break"
            case ":":
                self._set_mode(COMMAND)
                return "break"

        # Escape is a no-op in Normal (already in Normal)
        if keysym == "Escape":
            self.text.tag_remove(tk.SEL, "1.0", tk.END)
            return "break"

        # Suppress all other printable characters in Normal mode
        if char and char.isprintable():
            return "break"

        return None

    # ------------------------------------------------------------------
    # Pending two-char operator handler
    # ------------------------------------------------------------------

    def _handle_pending(self, keysym: str, char: str) -> bool:  # noqa: C901
        """Route second char to the appropriate operator handler."""
        op = self._pending
        self._pending = ""
        if op == "g":
            return self._pending_g(char)
        if op == "d":
            return self._pending_d(char)
        if op == "di":
            return self._pending_di(char)
        if op == "c":
            return self._pending_c(char)
        if op == "ci":
            return self._pending_ci(char)
        if op == "y":
            return self._pending_y(char)
        return True

    def _pending_g(self, char: str) -> bool:
        """g prefix: gg → go to first line."""
        if char == "g":
            self.text.mark_set(tk.INSERT, "1.0")
            self.text.see(tk.INSERT)
        return True

    def _pending_d(self, char: str) -> bool:
        """d prefix: dd, dw, di."""
        if char == "d":
            operator.delete_line(self.text)
            self.text.see(tk.INSERT)
            self._vim_msg("1 line deleted")
        elif char == "w":
            operator.delete_to_word_end(self.text)
            self._vim_msg("deleted to word end")
        elif char == "i":
            self._pending = "di"
        return True

    def _pending_di(self, char: str) -> bool:
        """di prefix: diw."""
        if char == "w":
            operator.delete_inner_word(self.text)
            self._vim_msg("deleted inner word")
        return True

    def _pending_c(self, char: str) -> bool:
        """c prefix: cw, ci."""
        if char == "w":
            operator.change_to_word_end(self.text)
            self._set_mode(INSERT)
        elif char == "i":
            self._pending = "ci"
        return True

    def _pending_ci(self, char: str) -> bool:
        """ci prefix: ciw."""
        if char == "w":
            operator.change_inner_word(self.text)
            self._set_mode(INSERT)
        return True

    def _pending_y(self, char: str) -> bool:
        """y prefix: yy."""
        if char == "y":
            operator.yank_line(self.text)
            self._vim_msg("1 line yanked")
        return True

    # ------------------------------------------------------------------
    # VISUAL mode
    # ------------------------------------------------------------------

    def _handle_visual(self, keysym: str, char: str, event: tk.Event) -> str | None:
        is_line_mode = self._mode == VISUAL_LINE

        # Escape → back to Normal
        if keysym == "Escape":
            self.text.tag_remove(tk.SEL, "1.0", tk.END)
            self._set_mode(NORMAL)
            return "break"

        # Motion keys extend the selection
        moved = False
        match char:
            case "h":
                self.text.mark_set(tk.INSERT, motion.move_left(self.text))
                moved = True
            case "l":
                self.text.mark_set(tk.INSERT, motion.move_right(self.text))
                moved = True
            case "k":
                self.text.mark_set(tk.INSERT, motion.move_up(self.text))
                moved = True
            case "j":
                self.text.mark_set(tk.INSERT, motion.move_down(self.text))
                moved = True
            case "w":
                self.text.mark_set(tk.INSERT, motion.word_start_next(self.text))
                moved = True
            case "b":
                self.text.mark_set(tk.INSERT, motion.word_start_prev(self.text))
                moved = True
            case "G":
                last = int(self.text.index(tk.END).split(".")[0]) - 1
                self.text.mark_set(tk.INSERT, f"{last}.0")
                moved = True

        match keysym:
            case "Up":
                self.text.mark_set(tk.INSERT, motion.move_up(self.text))
                moved = True
            case "Down":
                self.text.mark_set(tk.INSERT, motion.move_down(self.text))
                moved = True
            case "Left":
                self.text.mark_set(tk.INSERT, motion.move_left(self.text))
                moved = True
            case "Right":
                self.text.mark_set(tk.INSERT, motion.move_right(self.text))
                moved = True

        if moved:
            self.text.see(tk.INSERT)
            if is_line_mode:
                self._update_visual_line_selection()
            else:
                self._update_visual_selection()
            return "break"

        # Actions on selection
        match char:
            case "d" | "x":
                if is_line_mode:
                    n = self._visual_line_count()
                    operator.delete_lines_selection(self.text)
                    self._vim_msg(f"{n} line{'s' if n != 1 else ''} deleted")
                else:
                    operator.delete_selection(self.text)
                    self._vim_msg("selection deleted")
                self._set_mode(NORMAL)
                return "break"
            case "y":
                if is_line_mode:
                    n = self._visual_line_count()
                    operator.yank_lines_selection(self.text)
                    self._vim_msg(f"{n} line{'s' if n != 1 else ''} yanked")
                else:
                    operator.yank_selection(self.text)
                    self._vim_msg("selection yanked")
                self._set_mode(NORMAL)
                return "break"
            case "c":
                if is_line_mode:
                    operator.delete_lines_selection(self.text)
                else:
                    operator.delete_selection(self.text)
                self._set_mode(INSERT)
                return "break"

        if keysym == "Escape":
            self.text.tag_remove(tk.SEL, "1.0", tk.END)
            self._set_mode(NORMAL)
            return "break"

        # Suppress printable chars in visual mode (except handled above)
        if char and char.isprintable():
            return "break"

        return None

    def _update_visual_selection(self) -> None:
        """Update character-wise visual selection between anchor and cursor."""
        cursor = self.text.index(tk.INSERT)
        anchor = self._visual_anchor
        # Determine order
        if self.text.compare(anchor, "<=", cursor):
            sel_start, sel_end = anchor, f"{cursor}+1c"
        else:
            sel_start, sel_end = cursor, f"{anchor}+1c"
        self.text.tag_remove(tk.SEL, "1.0", tk.END)
        self.text.tag_add(tk.SEL, sel_start, sel_end)

    def _update_visual_line_selection(self) -> None:
        """Update line-wise visual selection."""
        cursor_line = int(self.text.index(tk.INSERT).split(".")[0])
        anchor_line = self._visual_line_anchor
        start_line = min(cursor_line, anchor_line)
        end_line = max(cursor_line, anchor_line)
        self.text.tag_remove(tk.SEL, "1.0", tk.END)
        self.text.tag_add(tk.SEL, f"{start_line}.0", f"{end_line + 1}.0")

    def _visual_line_count(self) -> int:
        """Return the number of lines currently selected in Visual Line mode."""
        return abs(
            int(self.text.index(tk.INSERT).split(".")[0]) - self._visual_line_anchor
        ) + 1
