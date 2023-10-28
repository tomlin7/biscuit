from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from ... import App

import platform
import tkinter as tk
import tkinter.filedialog as filedialog
from tkinter.filedialog import asksaveasfilename


class Events:
    def __init__(self, base: App) -> None:
        self.base = base
        self.count = 1
        self.maximized = False
        self.minimized = False
        self.previous_pos = None

    def new_file(self, *_) -> None:
        self.base.open_editor(f"Untitled-{self.count}", exists=False)
        self.count += 1

    def new_window(self, *_) -> None:
        self.base.open_new_window()

    def open_file(self, *_) -> None:
        self.base.open_editor(filedialog.askopenfilename())

    def open_directory(self, *_) -> None:
        self.base.open_directory(filedialog.askdirectory())

    def save(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content:
                if not editor.content.exists:
                    return self.save_as()
                if editor.content.editable:
                    editor.save()

    def save_as(self, *_) -> None:
        #TODO set initial filename to a range of text inside the editor
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                if path := asksaveasfilename(title="Save As...", defaultextension=".txt", initialfile=("Untitled")):
                    editor.save(path)

    def save_all(self, *_) -> None:
        for editor in self.base.editorsmanager.editors:
            if editor.content:
                if not editor.content.exists:
                    if path := asksaveasfilename(title="Save As...", defaultextension=".txt", initialfile=("Untitled")):
                        return editor.save(path)
                if editor.content.editable:
                    editor.save()

    def close_file(self, *_) -> None:
        self.base.close_active_editor()

    def close_dir(self, *_) -> None:
        self.base.close_active_directory()

    def quit(self, *_) -> None:
        self.base.destroy()

    def clone_repo(self, url) -> None:
        if path := filedialog.askdirectory():
            self.base.clone_repo(url, path)

    def toggle_maximize(self, *_) -> None:
        match platform.system():
            case "Windows" | "Darwin":
                self.base.wm_state('normal' if self.maximized else 'zoomed')
            # TODO windows specific maximizing
            # case "Windows":
            #     from ctypes import windll
            #     if not self.maximized:
            #         hwnd = windll.user32.GetParent(self.base.winfo_id())
            #         SWP_SHOWWINDOW = 0x40
            #         windll.user32.SetWindowPos(hwnd, 0, 0, 0, int(self.base.winfo_screenwidth()), int(self.base.winfo_screenheight()-48),SWP_SHOWWINDOW)
            #     else:
            #         hwnd = windll.user32.GetParent(self.base.winfo_id())
            #         SWP_SHOWWINDOW = 0x40
            #         windll.user32.SetWindowPos(hwnd, 0, self.previous_pos[0], self.previous_pos[1], int(self.base.minsize()[0]), int(self.base.minsize()[1]), SWP_SHOWWINDOW)
            case _:
                self.base.wm_attributes('-zoomed', self.maximized)

        self.maximized = not self.maximized


    def minimize(self, *_) -> None:
        self.base.update_idletasks()

        if platform.system() == 'Windows':
            from ctypes import windll
            hwnd = windll.user32.GetParent(self.base.winfo_id())
            windll.user32.ShowWindow(hwnd, 6)
        else:
            self.base.withdraw()

        self.minimized = True

    def window_mapped(self, *_) -> None:
        self.base.update_idletasks()
        if self.minimized:
            self.base.deiconify()
            self.minimized = False

    #TODO not fast but work ; may not good for a big file edit
    def undo(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.edit_undo()

    def redo(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.edit_redo()

    def cut(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.cut()

    def copy(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.copy()

    def paste(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.paste()
    def find(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.open_find_replace()

    def replace(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.open_find_replace()

    def select_all(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.tag_add("sel", "1.0", "end")

    def select_line(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.select_line(editor.content.text.index(tk.INSERT))

    def delete_line(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.delete_line()

    def copy_line_up(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.copy_line_up()

    def copy_line_down(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.copy_line_down()

    def move_line_up(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.move_line_up()

    def move_line_down(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.move_line_down()

    def duplicate_selection(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.duplicate_selection()

    def show_explorer(self, *_) -> None:
        self.base.sidebar.show_explorer()

    def show_search(self, *_) -> None:
        self.base.sidebar.show_search()

    def show_source_control(self, *_) -> None:
        self.base.sidebar.show_source_control()

    def show_extensions(self, *_) -> None:
        self.base.sidebar.show_extensions()

    def show_terminal(self, *_) -> None:
        self.base.panel.show_terminal()

    def show_logs(self, *_) -> None:
        self.base.panel.show_logs()
