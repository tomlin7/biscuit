import platform
import tkinter.filedialog as filedialog
from tkinter.filedialog import asksaveasfilename


class Events:
    def __init__(self, base):
        self.base = base
        self.count = 1
        self.maximized = False
        self.minimized = False
        self.previous_pos = None

    def new_file(self, *_):
        self.base.open_editor(f"Untitled-{self.count}", exists=False)
        self.count += 1

    def new_window(self, *_):
        self.base.open_new_window()

    def open_file(self, *_):
        self.base.open_editor(filedialog.askopenfilename())

    def open_directory(self, *_):
        self.base.open_directory(filedialog.askdirectory())

    def save(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content:
                if not editor.content.exists:
                    return self.save_as()
                if editor.content.editable:
                    editor.save()

    def save_as(self, *_):
        #TODO set initial filename to a range of text inside the editor
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                if path := asksaveasfilename(title="Save As...", defaultextension=".txt", initialfile=("Untitled")):
                    editor.save(path)

    def save_all(self, *_):
        for editor in self.base.editorsmanager.editors:
            if editor.content:
                if not editor.content.exists:
                    if path := asksaveasfilename(title="Save As...", defaultextension=".txt", initialfile=("Untitled")):
                        return editor.save(path)
                if editor.content.editable:
                    editor.save()

    def close_file(self, *_):
        self.base.close_active_editor()
    
    def close_dir(self, *_):
        self.base.close_active_directory()

    def quit(self, *_):
        self.base.destroy()
    
    def clone_repo(self, url):
        if path := filedialog.askdirectory():
            self.base.clone_repo(url, path)
    
    def toggle_maximize(self, *_):
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
        
    
    def minimize(self, *_):
        self.base.update_idletasks()

        if platform.system() == 'Windows':
            from ctypes import windll
            hwnd = windll.user32.GetParent(self.base.winfo_id())
            windll.user32.ShowWindow(hwnd, 6)
        else:
            self.base.withdraw()

        self.minimized = True
    
    def window_mapped(self, *_):
        self.base.update_idletasks()
        if self.minimized:
            self.base.deiconify()
            self.minimized = False
        
    #TODO not fast but work ; may not good for a big file edit
    def undo(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.edit_undo()
                    
    def redo(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.edit_redo()
    
    def cut(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.cut()

    def copy(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.copy()

    def paste(self, *_):
        if editor := self.base.editorsmanager.active_editor:
            if editor.content and editor.content.editable:
                editor.content.paste()
