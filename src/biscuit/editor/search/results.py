import os
import re
import tkinter as tk
from tkinter.messagebox import askyesno

from biscuit.common.ui import Frame, Label, Tree


class SearchResults(Frame):
    """The Search Results view for SearchEditor.
    
    Displays search results in a tree and provides search/replace logic.
    """

    def __init__(self, master, editor, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.editor = editor

        self.treeview = Tree(self)
        self.treeview.pack(fill=tk.BOTH, expand=True)
        self.treeview.bind("<Double-1>", self.click)

        self.ignore_folders = [
            ".git", "__pycache__", "venv", "node_modules", "docs", "build", 
            "dist", "bin", "obj", "out", "target", ".next", ".source", "artifacts"
        ]
        self.ignore_exts = [".pyc", ".exe", ".dll", ".so", ".bin", ".jpg", ".png", ".gif", ".pdf", ".zip", ".tar.gz"]

        self.results = []
        self.searching = False
        self.case_sensitive = False
        self.whole_word = False
        self.regex = False

        self.replacing = False

    def clear_tree(self) -> None:
        self.treeview.delete(*self.treeview.get_children())

    def click(self, _) -> None:
        item = self.treeview.focus()
        if not item:
            return

        tags = self.treeview.item(item)["tags"]
        if tags and len(tags) >= 2:
            file_path = tags[0]
            line_number = int(tags[1])
            self.base.open_editor(file_path)
            self.base.editorsmanager.active_editor.content.text.goto_line(line_number)

    def search_casesensitive(self, *_) -> None:
        self.case_sensitive = not self.case_sensitive
        self.search()

    def search_wholeword(self, *_) -> None:
        self.whole_word = not self.whole_word
        self.search()

    def search_regex(self, *_) -> None:
        self.regex = not self.regex
        self.search()

    def replace_normal(self, *_) -> None:
        self.replace()

    def toggle_collapse(self, *_) -> None:
        if not self.results:
            return

        open = not self.treeview.item(self.treeview.get_children()[0], "open")
        for i in self.treeview.get_children():
            self.treeview.item(i, open=open)

    def search(self, *_) -> None:
        if self.searching:
            return
        
        search_string = self.editor.searchbox.get()
        if not search_string:
            self.editor.hide_results()
            self.clear_tree()
            return

        self.searching = True
        self.editor.show_results()
        self.clear_tree()
        self.results = []

        if not self.base.active_directory:
            self.searching = False
            return

        count = 0
        file_count = 0
        for root, dirs, files in os.walk(self.base.active_directory):
            dirs[:] = [d for d in dirs if d not in self.ignore_folders]
            
            for file in files:
                if any(file.endswith(ext) for ext in self.ignore_exts):
                    continue
                
                file_path = os.path.join(root, file)
                res = self.search_in_file(file_path, search_string)
                if res:
                    file_count += 1
                    count += res
                    self.editor.count_label.config(text=f"Searching... {count}")
                    self.base.update()

        if count > 0:
            self.editor.count_label.config(text=f"{count}/{count}")
        else:
            self.editor.count_label.config(text="0/0")

        self.searching = False

    def search_in_file(self, file_path: str, search_string: str) -> int:
        occurrences = 0
        result_lines = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for line_number, line in enumerate(lines, start=1):
                    found = False
                    if self.regex:
                        flags = 0 if self.case_sensitive else re.IGNORECASE
                        matches = list(re.finditer(search_string, line, flags))
                        if matches:
                            found = True
                            occurrences += len(matches)
                    elif self.whole_word:
                        pattern = r"\b" + re.escape(search_string) + r"\b"
                        flags = 0 if self.case_sensitive else re.IGNORECASE
                        matches = list(re.finditer(pattern, line, flags))
                        if matches:
                            found = True
                            occurrences += len(matches)
                    else:
                        if self.case_sensitive:
                            if search_string in line:
                                found = True
                                occurrences += line.count(search_string)
                        else:
                            if search_string.lower() in line.lower():
                                found = True
                                occurrences += line.lower().count(search_string.lower())

                    if found:
                        result_lines.append((line_number, line.strip()))
        except (UnicodeDecodeError, PermissionError):
            return 0

        if occurrences > 0:
            relpath = os.path.relpath(file_path, self.base.active_directory)
            parent = self.treeview.insert("", tk.END, text=f"{relpath} ({occurrences})", open=True)
            for line_number, line in result_lines:
                # Display line number and the line content
                child = self.treeview.insert(parent, tk.END, text=f"  {line_number:4}: {line}")
                self.treeview.item(child, tags=(file_path, line_number))
            
            for line_number, line in result_lines:
                self.results.append({
                    "file_path": file_path,
                    "line": line_number,
                    "text": search_string 
                })
        
        return occurrences

    def replace(self) -> None:
        replace_string = self.editor.replacebox.get()
        if not self.results:
            return

        if askyesno("Replace Confirmation", f"Are you sure you want to replace all occurrences with '{replace_string}'?"):
            self.replacing = True
            files = {}
            for res in self.results:
                if res['file_path'] not in files:
                    files[res['file_path']] = []
                files[res['file_path']].append(res)
            
            for file_path, items in files.items():
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                
                for item in items:
                    line_idx = item['line'] - 1
                    if self.regex:
                        flags = 0 if self.case_sensitive else re.IGNORECASE
                        lines[line_idx] = re.sub(self.editor.searchbox.get(), replace_string, lines[line_idx], flags=flags)
                    elif self.whole_word:
                        pattern = r"\b" + re.escape(self.editor.searchbox.get()) + r"\b"
                        flags = 0 if self.case_sensitive else re.IGNORECASE
                        lines[line_idx] = re.sub(pattern, replace_string, lines[line_idx], flags=flags)
                    else:
                        if self.case_sensitive:
                            lines[line_idx] = lines[line_idx].replace(self.editor.searchbox.get(), replace_string)
                        else:
                            pattern = re.compile(re.escape(self.editor.searchbox.get()), re.IGNORECASE)
                            lines[line_idx] = pattern.sub(replace_string, lines[line_idx])

                with open(file_path, "w", encoding="utf-8") as f:
                    f.writelines(lines)
            
            self.search() 
            self.replacing = False
