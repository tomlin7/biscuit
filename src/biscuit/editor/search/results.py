import json
import os
import re
import subprocess
import tkinter as tk
from tkinter.messagebox import askyesno

from biscuit.common.ui import Frame, Label, Tree


class SearchResults(Frame):
    """The Search Results view for SearchEditor.
    
    Displays search results in a tree and provides search/replace logic.
    Uses ripgrep for fast searching.
    """

    def __init__(self, master, editor, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.editor = editor

        self.treeview = Tree(self)
        self.treeview.pack(fill=tk.BOTH, expand=True)
        self.treeview.bind("<Double-1>", self.click)

        self.results = []
        self.searching = False
        self.case_sensitive = False
        self.whole_word = False
        self.regex = False

        self.replacing = False
        self.open_editors_only = False

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
        self.replace_all()

    def toggle_collapse(self, *_) -> None:
        if not self.results:
            return

        children = self.treeview.get_children()
        if not children:
            return
            
        open_state = not self.treeview.item(children[0], "open")
        for i in children:
            self.treeview.item(i, open=open_state)

    def toggle_open_editors_only(self, *_) -> None:
        self.open_editors_only = not self.open_editors_only
        self.search()

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

        if not self.base.active_directory and not self.open_editors_only:
            self.searching = False
            return

        # Prepare ripgrep command
        command = ["rg", "--json", "--line-number", "--column"]
        
        if not self.case_sensitive:
            command.append("-i")
        
        if self.whole_word:
            command.append("-w")
            
        if not self.regex:
            command.append("-F") # Fixed strings (literal)

        command.append(search_string)

        # Includes
        include_pattern = self.editor.includes.get()
        if include_pattern:
            for pattern in include_pattern.split(","):
                pattern = pattern.strip()
                if pattern:
                    command.extend(["-g", pattern])
        
        # Excludes
        exclude_pattern = self.editor.excludes.get()
        if exclude_pattern:
            for pattern in exclude_pattern.split(","):
                pattern = pattern.strip()
                if pattern:
                    command.extend(["-g", f"!{pattern}"])

        if self.open_editors_only:
            # Gather paths from open editors
            paths = []
            for editor in self.base.editorsmanager.editors:
                if editor.path and os.path.isfile(editor.path):
                    paths.append(editor.path)
            
            if not paths:
                self.searching = False
                self.editor.count_label.config(text="No open files")
                return
            
            command.extend(paths)
        else:
            command.append(self.base.active_directory)

        try:
            process = subprocess.Popen(
                command, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True, 
                encoding="utf-8",
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            )

            file_results = {}
            total_matches = 0

            for line in process.stdout:
                try:
                    data = json.loads(line)
                    if data["type"] == "match":
                        match_data = data["data"]
                        file_path = match_data["path"]["text"]
                        line_number = match_data["line_number"]
                        line_text = match_data["lines"]["text"].strip()
                        
                        if file_path not in file_results:
                            file_results[file_path] = []
                        
                        file_results[file_path].append((line_number, line_text))
                        total_matches += 1
                        
                        if total_matches % 500 == 0:
                            self.editor.count_label.config(text=f"Searching... {total_matches}")
                            self.base.update()
                            
                except (json.JSONDecodeError, KeyError):
                    continue

            process.wait()

            for file_path, matches in file_results.items():
                relpath = os.path.relpath(file_path, self.base.active_directory)
                parent = self.treeview.insert("", tk.END, text=f"{relpath} ({len(matches)})", open=True)
                for line_number, line_text in matches:
                    child = self.treeview.insert(parent, tk.END, text=f"  {line_number:4}: {line_text}")
                    self.treeview.item(child, tags=(file_path, line_number))
                    
                    self.results.append({
                        "file_path": file_path,
                        "line": line_number,
                        "text": search_string 
                    })

            if total_matches > 0:
                self.editor.count_label.config(text=f"{total_matches}/{total_matches}")
            else:
                self.editor.count_label.config(text="0/0")

        except Exception as e:
            self.base.logger.error(f"Ripgrep error: {e}")
            self.editor.count_label.config(text="rg error")

        self.searching = False

    def replace_single(self, *_) -> None:
        item = self.treeview.focus()
        if not item:
            return

        tags = self.treeview.item(item)["tags"]
        if not tags or len(tags) < 2:
            return

        file_path = tags[0]
        line_number = int(tags[1])
        replace_string = self.editor.replacebox.get()
        search_string = self.editor.searchbox.get()

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            line_idx = line_number - 1
            if self.regex:
                flags = 0 if self.case_sensitive else re.IGNORECASE
                lines[line_idx] = re.sub(search_string, replace_string, lines[line_idx], count=1, flags=flags)
            elif self.whole_word:
                pattern = r"\b" + re.escape(search_string) + r"\b"
                flags = 0 if self.case_sensitive else re.IGNORECASE
                lines[line_idx] = re.sub(pattern, replace_string, lines[line_idx], count=1, flags=flags)
            else:
                if self.case_sensitive:
                    lines[line_idx] = lines[line_idx].replace(search_string, replace_string, 1)
                else:
                    pattern = re.compile(re.escape(search_string), re.IGNORECASE)
                    lines[line_idx] = pattern.sub(replace_string, lines[line_idx], count=1)

            with open(file_path, "w", encoding="utf-8") as f:
                f.writelines(lines)
            
            self.search()
        except Exception as e:
            self.base.logger.error(f"Replace error in {file_path}: {e}")

    def replace_all(self, *_) -> None:
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
                try:
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
                except Exception as e:
                    self.base.logger.error(f"Replace error in {file_path}: {e}")

            self.search() 
            self.replacing = False
