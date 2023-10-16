import os
import re
import tkinter as tk
from tkinter.constants import *

from biscuit.core.components.utils import Frame, Label, Tree


class Results(Frame):
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        self.label = Label(self, text="Search", width=100)
        self.label.pack(fill=X, expand=True, anchor=W)

        self.treeview = Tree(self)
        self.treeview.pack(fill=X, side=LEFT, anchor=N, expand=True)

        # self.replacebox.children["!iconbutton"].bind("<Button-1>", self.replace)
        # self.replacebox.children["!iconbutton"].bind("<Button-1>", self.replace_matchcase)
        
        self.searching = False
        self.case_sensitive = False
        self.whole_word = False
        self.regex = False

    def add_item(self, parent, index, text):
        try:
            result = self.treeview.insert(parent=parent, index=index, text=text)
            return result

        except Exception as e:
            print("Failed to add item", e)

    def clear_tree(self):
        self.treeview.delete(*self.treeview.get_children())

    def delete_item(self, item):
        self.treeview.delete(item)

    def click(self, event):
        # Thanks to tobias_k's answer here https://stackoverflow.com/questions/30614279/tkinter-treeview-get-selected-item-values
        item = self.treeview.focus()

        try: # Click on child item
            self.base.open_editor(self.treeview.item(item)["tags"][0])
            self.base.editorsmanager.active_editor.content.goto(int(self.treeview.item(item)["tags"][1])) # TODO: Seems to only scroll part of the time

        except IndexError: # Click on parent item
            print("You clicked on a parent item")

    def search_casesensitive(self, event):
        self.case_sensitive = True
        self.search()
        self.case_sensitive = False

    def search_wholeword(self, event):
        self.whole_word = True
        self.search()
        self.whole_word = False

    def search_regex(self, event):
        self.regex = True
        self.search()
        self.regex = False

    def search(self, *args, **kwargs):
        if self.searching == False:
            self.searching = True

            self.label.config(text="Searching...")
            self.base.notifications.info("Searching...")

            found_files = []
            total_occurrences = 0
            search_string = self.master.searchbox.get()

            self.clear_tree() # Remove all items from the tree

            if self.base.active_directory:
                for root, _, files in os.walk(self.base.active_directory):
                    for file in files:
                        file_path = os.path.join(root, file)
                        result = self.search_in_file(file_path, search_string)
                        if result:
                            found_files.append(result[0])

                            total_occurrences = total_occurrences + result[1]
                            self.label.config(text=f"Searching {len(found_files)} files...")
                        
                        self.base.root.update()

                if len(found_files) > 0:
                    self.label.config(text=f"{total_occurrences} results for '{search_string}'")

                else:
                    self.label.config(text="No results.")

            else:
                self.label.config(text="No folder selected.")

            self.base.notifications.hide()
            self.searching = False

        else:
            self.base.notifications.warning("Already searching!")


    def search_in_file(self, file_path, search_string):
        found = False
        occurrences = 0
        result_lines = []

        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:

            for line_number, line in enumerate(f, start=1):
                if self.case_sensitive == True:
                    if search_string in line:
                        found = True
                        occurrences += line.count(search_string)
                        result_lines.append((line_number, line.strip()))

                elif self.whole_word == True:
                    result = re.search(r"\b" + search_string + r"\b", line)
                    
                    if result:
                        found = True
                        occurrences += len(re.findall(r"\b" + search_string + r"\b", line))
                        result_lines.append((line_number, line.strip()))

                elif self.regex == True:
                    result = re.search(search_string, line)

                    if result:
                        found = True
                        occurrences += len(re.findall(search_string, line))
                        result_lines.append((line_number, line.strip()))

                else:
                    if search_string.lower() in line.lower():
                        found = True
                        occurrences += line.count(search_string.lower())
                        result_lines.append((line_number, line.strip()))

        if found:
            parent_elm = self.add_item(parent="", index=tk.END, text=f"[{occurrences}] {os.path.basename(file_path)} | {file_path}")

            for line_number, line in result_lines:
                child_elm = self.add_item(parent=parent_elm, index=tk.END, text=f"line {line_number}: {line}")
                self.treeview.item(child_elm, tags=(file_path, line_number))
                self.treeview.bind("<Double-1>", self.click)

            return [file_path, occurrences, line_number]
