from __future__ import annotations

import os
import platform
import tkinter as tk
import tkinter.filedialog as filedialog
import typing
import webbrowser as web
from tkinter import messagebox
from tkinter.filedialog import asksaveasfilename

from biscuit.common.classdrill import *

if typing.TYPE_CHECKING:
    from .app import App


class Commands:
    """Commands that can be triggered by the user.

    This class contains all the commands that can be triggered by the user.
    All the methods that are not decorated with `@command_palette_ignore` are exported to
    the command palette and can be triggered by the user.

    The `@command_palette_ignore` decorator is used to ignore a method from being exported to the command palette.
    """

    def __init__(self, base: App) -> None:
        self.base: App = base
        self.count = 1
        self.maximized = False
        self.minimized = False
        self.previous_pos = None

    def new_file(self, *_) -> None:
        self.base.open_editor(f"Untitled-{self.count}", exists=False)
        self.count += 1

    def new_window(self, *_) -> None:
        self.base.open_new_window()

    def open_empty_editor(self, *_) -> None:
        self.new_file()

    def open_file(self, *_) -> None:
        path = filedialog.askopenfilename()
        if not path or not os.path.isfile(path):
            return
        self.base.open_editor(path)
        self.base.history.register_file_history(path)

    def open_directory(self, *_) -> None:
        path = filedialog.askdirectory()
        if not path or not os.path.isdir(path):
            return
        self.base.open_directory(path)
        self.base.history.register_folder_history(path)

    def open_recent_file(self, *_):
        self.base.palette.show("recentf:")

    def open_recent_dir(self, *_):
        self.base.palette.show("recentd:")

    def restore_last_closed_editor(self, *_) -> None:
        self.base.editorsmanager.restore_last_closed_editor()

    def save_file(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content:
                if not editor.content.exists:
                    return self.save_file_as()
                if editor.content.editable:
                    editor.save()

    def save_file_as(self, *_) -> None:
        # TODO set initial filename to a range of text inside the editor
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                if path := asksaveasfilename(
                    title="Save As...",
                    initialfile=(editor.filename or "Untitled.txt"),
                ):
                    editor.save(path)

    def save_all(self, *_) -> None:
        for editor in self.base.editorsmanager.active_editors:
            if editor.content:
                if not editor.content.exists:
                    if path := asksaveasfilename(
                        title="Save As...",
                        initialfile=(editor.filename or "Untitled.txt"),
                    ):
                        return editor.save(path)
                if editor.content.editable:
                    editor.save()

    def open_settings(self, *_) -> None:
        self.base.open_settings()

    def close_editor(self, *_) -> None:
        self.base.close_active_editor()

    def close_folder(self, *_) -> None:
        self.base.close_active_directory()

    def quit_biscuit(self, *_) -> None:
        self.base.on_close_app()
        # self.base.destroy()

    def maximize_biscuit(self, *_) -> None:
        match platform.system():
            case "Windows" | "Darwin":
                self.base.wm_state("normal" if self.maximized else "zoomed")
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
                self.base.wm_attributes("-zoomed", self.maximized)

        self.maximized = not self.maximized

    def minimize_biscuit(self, *_) -> None:
        self.base.update_idletasks()

        if platform.system() == "Windows":
            from ctypes import windll

            try:
                hwnd = windll.user32.GetParent(self.base.winfo_id())
                windll.user32.ShowWindow(hwnd, 6)
            except Exception as e:
                print(e)
                self.base.withdraw()
        else:
            self.base.withdraw()
            self.base.notifications.hide()

        self.minimized = True

    @command_palette_ignore
    def window_mapped(self, *_) -> None:
        self.base.update_idletasks()
        if self.minimized:
            self.base.deiconify()
            self.minimized = False

    def toggle_wordwrap(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                self.base.wrap_words = not self.base.wrap_words
                editor.content.text.refresh_wrap()

    def toggle_block_cursor(self, *_) -> None:
        self.base.block_cursor = not self.base.block_cursor
        if e := self.base.editorsmanager.active_editor:
            if e.content and e.content.editable:
                e.content.text.set_block_cursor(self.base.block_cursor)

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
                editor.content.text.cut()

    def copy(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.copy()

    def paste(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.paste()

    def toggle_comment(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.toggle_comment()

    def find_symbol(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.open_find_replace()

    def replace_symbol(self, *_) -> None:
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
                editor.content.text.event_delete_line()

    def copy_line_up(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.event_copy_line_up()

    def copy_line_down(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.event_copy_line_down()

    def move_line_up(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.event_move_line_up()

    def move_line_down(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.event_move_line_down()

    def duplicate_selection(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.event_duplicate_selection()

    def go_to_symbol_definition(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.request_definition(from_menu=True)

    def find_symbol_references(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.request_references(from_menu=True)

    def rename_symbol(self, *_) -> None:
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.text.request_rename()

    def restart_extension_server(self, *_) -> None:
        self.base.extensions_manager.restart_server()

    def debugger_toggle_pause(self, *_):
        if self.base.debugger_manager.latest:
            self.base.debugger_manager.latest.continue_pause()

    def debugger_step_over(self, *_):
        if self.base.debugger_manager.latest:
            self.base.debugger_manager.latest.step_over()

    def debugger_step_into(self, *_):
        if self.base.debugger_manager.latest:
            self.base.debugger_manager.latest.step_in()

    def debugger_step_out(self, *_):
        if self.base.debugger_manager.latest:
            self.base.debugger_manager.latest.step_out()

    def debugger_restart(self, *_):
        if self.base.debugger_manager.latest:
            self.base.debugger_manager.latest.restart()

    def debugger_stop(self, *_):
        if self.base.debugger_manager.latest:
            self.base.debugger_manager.latest.stop()

    def show_explorer(self, *_) -> None:
        self.base.sidebar.show_explorer()

    def show_outline(self, *_) -> None:
        self.base.secondary_sidebar.show_outline()

    def show_search(self, *_) -> None:
        self.base.sidebar.show_search()

    def show_source_control(self, *_) -> None:
        self.base.secondary_sidebar.show_source_control()

    def show_debugger(self, *_) -> None:
        self.base.sidebar.show_debug()

    def show_extensions(self, *_) -> None:
        self.base.secondary_sidebar.show_extensions()

    def show_terminal(self, *_) -> None:
        self.base.panel.show_terminal()

    def show_logs(self, *_) -> None:
        self.base.panel.show_logs()

    def show_welcome(self, *_) -> None:
        self.base.editorsmanager.add_welcome()

    def show_command_palette(self, *_) -> None:
        self.base.palette.show(">")

    def show_symbol_palette(self, *_) -> None:
        self.base.palette.show("@")

    def show_active_editors(self, *_) -> None:
        self.base.palette.show("active:")

    def change_language_mode(self, *_) -> None:
        self.base.palette.show("language:")

    def change_end_of_line_character(self, *_) -> None:
        self.base.palette.show("eol:")

    def change_encoding(self, *_) -> None:
        self.base.palette.show("encoding:")

    def change_indentation_level(self, *_) -> None:
        self.base.palette.show("indent:")

    def clone_git_repository(self, *_) -> None:
        self.base.palette.show("clone:")

    def goto_line_column(self, *_) -> None:
        self.base.palette.show(":")

    def change_git_branch(self, *_) -> None:
        self.base.palette.show("branch:")

    @command_palette_ignore
    def show_run_config_palette(self, command) -> None:
        self.base.palette.show("runconf:", command)

    def search_google(self, *_) -> None:
        self.base.palette.show("google:")

    def configure_run_command(self, *_) -> None:
        self.base.palette.show("runconf:")

    def search_github_issues(self, *_) -> None:
        self.base.palette.show("issue:")

    def search_github_prs(self, *_) -> None:
        self.base.palette.show("pr:")

    def search_files(self, *_) -> None:
        self.base.palette.show()

    def open_biscuit_documentation(self, *_) -> None:
        web.open("https://tomlin7.github.io/biscuit/")

    def open_biscuit_release_notes(self, *_) -> None:
        web.open("https://github.com/tomlin7/biscuit/blob/main/CHANGELOG.md")

    def report_bug(self, *_) -> None:
        web.open(
            "https://github.com/tomlin7/biscuit/issues/new?assignees=tomlin7&labels=bug&projects=&template=bug_report.md"
        )

    def request_feature(self, *_) -> None:
        web.open(
            "https://github.com/tomlin7/biscuit/issues/new?assignees=tomlin7&labels=enhancement&projects=&template=feature_request.md"
        )

    def open_biscuit_code_of_conduct(self, *_) -> None:
        web.open("https://github.com/tomlin7/biscuit/blob/main/CODE_OF_CONDUCT.md")

    def view_biscuit_licenses(self, *_) -> None:
        web.open("https://github.com/tomlin7/biscuit/blob/main/LICENSE.md")

    def show_about(self, *_) -> None:
        messagebox.showinfo("Biscuit", str(self.base.system))
        self.base.logger.info(str(self.base.system))
