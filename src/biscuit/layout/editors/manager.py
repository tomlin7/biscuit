from __future__ import annotations

import os
import tkinter as tk
import typing
from tkinter.messagebox import askyesno
from typing import List, Union

from biscuit.common import ActionSet, Game
from biscuit.common.ui import Frame, PanedWindow
from biscuit.editor import Editor, SearchEditor, Welcome

from .pane import EditorPane

if typing.TYPE_CHECKING:
    from biscuit.editor import BaseEditor

    from ..content import Content


class EditorsManager(Frame):
    """Editors Manager

    - Manages split editor panes via a tree of nested PanedWindows
    - Each pane can be independently split in any direction
    """

    def __init__(self, master: Content, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)

        self.grid_propagate(False)
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.active_editors: List[Editor] = []
        self.closed_editors: List[Editor] = []
        self.max_closed_editors = 10

        self.root_pw = PanedWindow(
            self, orient=tk.HORIZONTAL,
            bg=self.base.theme.border, bd=0,
            sashwidth=3, sashpad=0, opaqueresize=False,
        )
        self.root_pw.grid(row=0, column=0, sticky=tk.NSEW)

        self._active_pane: EditorPane | None = None
        self._create_initial_pane()

        self.default_editors: List[Editor] = [Welcome(self)]

    def _create_initial_pane(self) -> None:
        pane = EditorPane(self.root_pw, self)
        self.root_pw.add(pane, stretch="always")
        self.root_pw.paneconfigure(pane, minsize=50)
        self._active_pane = pane

    def _pw_child(self, pw, path):
        return pw.nametowidget(str(path))

    def _collect_widget_paths(self, widget):
        paths = {}
        stack = [widget]
        while stack:
            w = stack.pop()
            paths[w] = w._w
            try:
                for c in w.winfo_children():
                    stack.append(c)
            except tk.TclError:
                continue
        return paths

    def get_all_panes(self) -> list[EditorPane]:
        result: list[EditorPane] = []
        self._collect_panes(self.root_pw, result)
        return result

    def _collect_panes(self, parent: tk.PanedWindow, result: list[EditorPane]) -> None:
        for child_path in parent.panes():
            child = self._pw_child(parent, child_path)
            if isinstance(child, EditorPane):
                result.append(child)
            elif isinstance(child, tk.PanedWindow):
                self._collect_panes(child, result)

    @property
    def panes(self) -> list[EditorPane]:
        return self.get_all_panes()

    def set_active_pane(self, pane: EditorPane) -> None:
        self._active_pane = pane
        if pane.active_editor:
            self.base.open_editors.set_active(pane.active_editor)
        self.refresh()

    def is_empty(self) -> bool:
        return not self.active_editors

    def is_open(self, path: str) -> bool:
        return any(
            editor.path
            and path
            and (os.path.abspath(editor.path) == os.path.abspath(path))
            for editor in self.active_editors
        )

    def get_active_actionset(self) -> ActionSet:
        self.actionset.update(
            [(editor.filename, editor) for editor in self.active_editors]
        )
        return self.actionset

    def generate_actionsets(self) -> None:
        self.actionset = ActionSet("Switch to active editors", "active:", [])
        self.base.palette.register_actionset(self.get_active_actionset)

        self.base.palette.register_actionset(
            lambda: ActionSet(
                "Configure Run Command",
                "runconf:",
                pinned=[
                    [
                        "Run: {}",
                        lambda command=None, e=self.base.editorsmanager.active_editor: (
                            e.content.set_run_command(command)
                            if command
                            else print("Command can't be empty!")
                        ),
                    ]
                ],
            )
        )

    def add_default_editors(self) -> None:
        self.add_editors(self.default_editors)

    def add_welcome(self) -> None:
        self.add_editor(Welcome(self))

    def add_search(self) -> None:
        self.add_editor(SearchEditor(self))

    def add_editors(self, editors: list[Editor]) -> None:
        for editor in editors:
            self.add_editor(editor)

    def add_editor(self, editor: Union[Editor, BaseEditor]) -> Editor | BaseEditor:
        if editor in self.active_editors:
            return self.set_active_editor(editor)

        self.active_editors.append(editor)
        if editor.content:
            editor.content.create_buttons(self.active_pane.action_container)
        self.active_pane.add_tab(editor)
        self.base.open_editors.add_item(editor)
        self.refresh()
        return editor

    def delete_all_editors(self) -> None:
        editors = list(self.active_editors)
        for pane in self.get_all_panes():
            pane.clear_tabs()
            pane.clear()
        for e in editors:
            e.destroy()
        self.active_editors.clear()
        self.base.open_editors.clear()
        self.refresh()

    def save_unsaved_changes(self, e: Editor) -> None:
        if e.content and e.content.editable and e.content.unsaved_changes:
            if askyesno(
                "Unsaved changes",
                f"Do you want to save the changes you made to {e.filename}",
            ):
                if e.exists:
                    e.save()
                else:
                    self.base.commands.save_file_as()

    def close_all_editors(self) -> None:
        for pane in list(self.get_all_panes()):
            for tab in list(pane.active_tabs):
                self.save_unsaved_changes(tab.editor)
                pane.close_tab(tab)
        self.refresh()

    def reopen_active_editor(self, *_) -> None:
        if editor := self.active_editor:
            if editor.exists:
                path = editor.path
                self.delete_editor(editor)
                self.update()
                self.open_editor(path)

    def reopen_editor(self, path: str):
        if not askyesno(
            "Reopen Editor",
            f"You will lose any unsaved changes to ({path}). Are you sure?",
        ):
            return

        try:
            self.delete_editor(self.get_editor(path))
            self.update()
            self.open_editor(path)
        except Exception as e:
            self.base.logger.error(f"Reopening editor failed: {e}")
            self.base.notifications.error("Reopening editor failed: see logs")

    def switch_tabs(self, path: str) -> Editor | None:
        for pane in self.get_all_panes():
            for tab in pane.active_tabs:
                if tab.editor.path == path:
                    tab.select()
                    return tab.editor

    def open_editor(
        self, path: str = None, exists=True, load_file=True
    ) -> Editor | BaseEditor:
        if path:
            if self.is_open(path):
                return self.switch_tabs(path)
            if path in self.closed_editors:
                return self.add_editor(self.closed_editors[path])

        return self.add_editor(Editor(self, path, exists, load_file=load_file))

    def open_diff_editor(self, path: str, exists: bool) -> None:
        self.add_editor(Editor(self, path, exists, diff=True))

    def diff_files(self, file1: str, file2: str, standalone: bool = False) -> None:
        self.add_editor(
            Editor(self, file1, True, file2, diff=True, standalone=standalone)
        )

    def open_game(self, id: str) -> None:
        self.add_editor(Game(self, id))

    def close_editor(self, editor: Editor) -> None:
        if editor in self.active_editors:
            self.active_editors.remove(editor)

        for pane in self.get_all_panes():
            if pane.active_editor == editor:
                pane.clear()

        try:
            editor.grid_forget()
        except tk.TclError:
            pass
        self.refresh()

        if editor.content and editor.content.editable:
            self.base.language_server_manager.tab_closed(editor.content.text)

        self.closed_editors.append(editor)
        if len(self.closed_editors) > self.max_closed_editors:
            oldest_editor = self.closed_editors.pop(0)
            oldest_editor.destroy()

        self.base.open_editors.remove_item(editor)

    def restore_last_closed_editor(self) -> None:
        if self.closed_editors:
            editor = self.closed_editors.pop()
            self.add_editor(editor)
        else:
            self.base.notifications.info("No recently closed editors to restore")

    def close_editor_by_path(self, path: str) -> None:
        e = self.get_editor(path)
        self.close_editor(e)
        return e

    def get_editor(self, path: str) -> Editor:
        for editor in self.active_editors:
            if editor.path == path:
                return editor

    def close_active_editor(self) -> None:
        if self.active_pane:
            self.active_pane.close_active_tab()

    def delete_editor(self, editor: Editor) -> None:
        if editor not in self.active_editors:
            return

        self.active_editors.remove(editor)

        for pane in self.get_all_panes():
            for tab in list(pane.active_tabs):
                if tab.editor == editor:
                    pane.active_tabs.remove(tab)
                    tab.destroy()
                    pane.clear()
                    break

        if editor.path in self.closed_editors:
            self.closed_editors.pop(editor.path)

        editor.destroy()
        self.base.open_editors.remove_item(editor)
        self.refresh()

    def set_active_editor(self, editor: Editor) -> Editor:
        for pane in self.get_all_panes():
            for tab in pane.active_tabs:
                if tab.editor == editor:
                    tab.select()
                    self.base.open_editors.set_active(editor)
                    self.refresh()
                    return editor
        return editor

    def set_active_editor_by_index(self, index: int) -> Editor:
        for pane in self.get_all_panes():
            if index < len(pane.active_tabs):
                pane.active_tabs[index].select()
                return pane.active_tabs[index].editor
            index -= len(pane.active_tabs)
        return None

    def set_active_editor_by_path(self, path: str) -> Editor:
        for pane in self.get_all_panes():
            for tab in pane.active_tabs:
                if (
                    tab.editor.path
                    and path
                    and (os.path.abspath(tab.editor.path) == os.path.abspath(path))
                ):
                    tab.select()
                    return tab.editor

    def close_pane(self, pane: EditorPane) -> None:
        parent_pw = self._find_parent_pw(pane)
        if not parent_pw:
            return

        if len(self.get_all_panes()) <= 1:
            return

        if pane is self._active_pane:
            sibling = None
            for child_path in parent_pw.panes():
                child = self._pw_child(parent_pw, child_path)
                if child is not pane:
                    sibling = child
                    break
            if sibling is not None:
                focus = sibling
                if isinstance(focus, tk.PanedWindow):
                    focus = self._first_pane(focus)
                self._active_pane = focus

        for tab in list(pane.active_tabs):
            self.close_editor(tab.editor)

        parent_pw.forget(pane)
        pane.destroy()
        self._cleanup_empty_pw(parent_pw)

    def _cleanup_empty_pw(self, pw: tk.PanedWindow) -> None:
        if pw.panes():
            return
        grandparent = pw.master
        if isinstance(grandparent, tk.PanedWindow):
            grandparent.forget(pw)
            pw.destroy()
            self._cleanup_empty_pw(grandparent)

    def _find_parent_pw(self, pane: EditorPane) -> tk.PanedWindow | None:
        for child_path in self.root_pw.panes():
            child = self._pw_child(self.root_pw, child_path)
            if child is pane:
                return self.root_pw
            if isinstance(child, tk.PanedWindow):
                result = self._find_parent_pw_recursive(child, pane)
                if result:
                    return result
        return None

    def _find_parent_pw_recursive(
        self, pw: tk.PanedWindow, pane: EditorPane
    ) -> tk.PanedWindow | None:
        for child_path in pw.panes():
            child = self._pw_child(pw, child_path)
            if child is pane:
                return pw
            if isinstance(child, tk.PanedWindow):
                result = self._find_parent_pw_recursive(child, pane)
                if result:
                    return result
        return None

    def _first_pane(self, pw: tk.PanedWindow) -> EditorPane | None:
        for child_path in pw.panes():
            child = self._pw_child(pw, child_path)
            if isinstance(child, EditorPane):
                return child
            if isinstance(child, tk.PanedWindow):
                return self._first_pane(child)
        return None

    def _split_pane(self, pane: EditorPane, orient: str) -> None:
        parent_pw = self._find_parent_pw(pane)
        if not parent_pw:
            return

        idx = None
        for i, child_path in enumerate(parent_pw.panes()):
            if self._pw_child(parent_pw, child_path) is pane:
                idx = i
                break
        if idx is None:
            return
        current_path = (
            pane.active_editor.path
            if pane.active_editor and pane.active_editor.path
            else None
        )

        parent_pw.forget(pane)
        remaining = list(parent_pw.panes())

        needs_nesting = bool(remaining) or parent_pw is not self.root_pw

        if not needs_nesting:
            parent_pw.configure(orient=orient)
            sibling = EditorPane(parent_pw, self)
            if current_path:
                new_editor = Editor(self, current_path, exists=True)
                self.active_editors.append(new_editor)
                sibling.add_tab(new_editor)
                self.base.open_editors.add_item(new_editor)
            parent_pw.add(pane, stretch="always")
            parent_pw.add(sibling, stretch="always")
            parent_pw.paneconfigure(pane, minsize=50)
            parent_pw.paneconfigure(sibling, minsize=50)
            self._active_pane = sibling
        else:
            saved_editors = [tab.editor for tab in list(pane.active_tabs)]

            pane.clear_tabs()
            pane.destroy()

            nested = PanedWindow(
                parent_pw, orient=orient,
                bg=self.base.theme.border, bd=0,
                sashwidth=3, sashpad=0, opaqueresize=False,
            )

            if idx < len(remaining):
                parent_pw.add(nested, stretch="always", before=remaining[idx])
            else:
                parent_pw.add(nested, stretch="always")

            new_pane = EditorPane(nested, self)
            sibling = EditorPane(nested, self)

            for editor in saved_editors:
                new_pane.add_tab(editor)

            if current_path:
                new_editor = Editor(self, current_path, exists=True)
                self.active_editors.append(new_editor)
                sibling.add_tab(new_editor)
                self.base.open_editors.add_item(new_editor)

            nested.add(new_pane, stretch="always")
            nested.add(sibling, stretch="always")
            nested.paneconfigure(new_pane, minsize=50)
            nested.paneconfigure(sibling, minsize=50)
            self._active_pane = sibling

        self._equalize_pw(parent_pw)

    def split_editor(self, *_) -> None:
        if self._active_pane:
            self._split_pane(self._active_pane, tk.HORIZONTAL)

    def split_editor_vertical(self, *_) -> None:
        if self._active_pane:
            self._split_pane(self._active_pane, tk.VERTICAL)

    def _equalize_pw(self, pw: tk.PanedWindow) -> None:
        self.update_idletasks()
        children = pw.panes()
        n = len(children)
        if n <= 1:
            return

        orient = pw.cget("orient")
        total = pw.winfo_width() if orient == tk.HORIZONTAL else pw.winfo_height()
        if total <= 0:
            return

        for i in range(n - 1):
            pos = (i + 1) * total // n
            if orient == tk.HORIZONTAL:
                pw.sash_place(i, pos, 0)
            else:
                pw.sash_place(i, 0, pos)

    def change_tab_forward(self) -> None:
        if self._active_pane:
            self._active_pane.change_tab_forward()

    def change_tab_back(self) -> None:
        if self._active_pane:
            self._active_pane.change_tab_back()

    @property
    def active_editor(self) -> Editor | None:
        if not self._active_pane:
            return None
        return self._active_pane.active_editor

    @property
    def active_pane(self) -> EditorPane | None:
        return self._active_pane

    def refresh(self) -> None:
        if not self.active_editors:
            self.base.set_title(
                os.path.basename(self.base.active_directory)
                if self.base.active_directory
                else None
            )
        self.base.update_statusbar()
