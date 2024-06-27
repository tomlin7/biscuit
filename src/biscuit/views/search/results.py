__author__ = "nfoert"

import os
import re
import tkinter as tk
from tkinter.messagebox import askyesno

from biscuit.common.ui import Frame, Label, Tree


class Results(Frame):
    """The Results view.

    The Results view displays the results of a search.
    - Show search results.
    - Replace text in search results.
    - Search case-sensitive.
    - Search whole words.
    - Search with regular expressions.
    - Clear search results.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        self.label = Label(self, text="Search")
        self.label.pack(fill=tk.X)

        self.treeview = Tree(self)
        self.treeview.pack(fill=tk.BOTH, expand=True)

        self.ignore_folders = [
            ".git",
            "__pycache__",
            "venv",
            "node_modules",
            "docs",
            "build",
            "dist",
            "bin",
            "obj",
            "out",
            "target",
        ]
        self.ignore_exts = []

        self.results = []

        self.searching = False
        self.case_sensitive = False
        self.whole_word = False
        self.regex = False

        self.replacing = False
        self.r_matchcase = False

    def add_item(self, parent: str, index: str, text: str, open=False) -> str:
        "Add an item to the tree for the search"
        try:
            result = self.treeview.insert(
                parent=parent, index=index, text=text, open=open
            )
            return result

        except Exception as e:
            print("Failed to add item", e)

    def clear_tree(self) -> None:
        "Clear all items from the tree"
        self.treeview.delete(*self.treeview.get_children())

    def delete_item(self, item: str) -> None:
        "Remove an item from the tree"
        self.treeview.delete(item)

    def click(self, _) -> None:
        "Event run when an item is clicked in the tree"
        # Thanks to tobias_k's answer here
        # https://stackoverflow.com/questions/30614279/tkinter-treeview-get-selected-item-values
        item = self.treeview.focus()

        try:  # Click on child item
            self.base.goto_location(
                self.treeview.item(item)["tags"][0],
                str(float(self.treeview.item(item)["tags"][1])),
            )

        except IndexError:  # Click on parent item
            print("You clicked on a parent item")

    def search_casesensitive(self, _) -> None:
        "Do a case sensitive search"
        self.case_sensitive = True
        self.search()
        self.case_sensitive = False

    def search_wholeword(self, _) -> None:
        "Do a whole word search"
        self.whole_word = True
        self.search()
        self.whole_word = False

    def search_regex(self, _) -> None:
        "Do a regex search"
        self.regex = True
        self.search()
        self.regex = False

    # Thanks to pythontutorial.net/tkinter/tkinter-askyesno
    def replace_normal(self, _) -> None:
        "Do a normal replace"
        self.replace()

    def search(self, *_) -> None:
        """
        Find every file in the selected directory and then search for occurrences in it
        """
        if not self.searching:
            self.searching = True

            self.label.config(text="Searching...")
            self.base.notifications.info("Searching...")

            found_files = []
            search_string = self.master.searchbox.get()

            self.clear_tree()
            self.results = []

            if self.base.active_directory:
                for root, _, files in os.walk(self.base.active_directory):
                    if root in self.ignore_folders:
                        continue

                    for file in files:
                        file_path = os.path.join(root, file)

                        if any(file.endswith(ext) for ext in self.ignore_exts):
                            continue

                        result = self.search_in_file(file_path, search_string)

                        if result:
                            found_files.append(result[0])
                            self.label.config(
                                text=f"Searched {len(found_files)} files..."
                            )

                        self.base.root.update()

                if len(found_files) > 0:
                    self.label.config(
                        text=f"{len(self.results)} results for '{search_string}'"
                    )

                else:
                    self.label.config(text="No results.")

            else:
                self.label.config(text="No folder selected.")

            self.base.notifications.hide()
            self.searching = False

        else:
            self.base.notifications.warning("Already searching!")

    def search_in_file(self, file_path: str, search_string: str) -> list:
        """
        Search a file for occurrences
        - Case insensitive
        - Case sensitive
        - Whole word
        - Regex
        """
        found = False
        occurrences = 0
        result_lines = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line_number, line in enumerate(f, start=1):
                    if self.case_sensitive:
                        if search_string in line:
                            found = True
                            occurrences += line.count(search_string)
                            result_lines.append((line_number, line.strip()))
                            text = search_string

                    elif self.whole_word:
                        result = re.search(r"\b" + search_string + r"\b", line)
                        if result:
                            found = True
                            occurrences += len(
                                re.findall(r"\b" + search_string + r"\b", line)
                            )
                            result_lines.append((line_number, line.strip()))
                            text = result.group()

                    elif self.regex:
                        result = re.search(search_string, line)

                        if result:
                            found = True
                            occurrences += len(re.findall(search_string, line))
                            result_lines.append((line_number, line.strip()))
                            text = result.group()

                    else:
                        if search_string.lower() in line.lower():
                            found = True
                            occurrences += line.count(search_string.lower())
                            result_lines.append((line_number, line.strip()))
                            text = search_string
        except UnicodeDecodeError:
            # case: file is non-text
            return

        if found:
            parent = self.add_item(
                parent="",
                index=tk.END,
                open=True,
                text=f"{os.path.basename(file_path)} | {file_path}",
            )

            for line_number, line in result_lines:
                child_elm = self.add_item(
                    parent=parent, index=tk.END, text=f"line {line_number}: {line}"
                )
                self.treeview.item(child_elm, tags=(file_path, line_number))
                self.treeview.bind("<Double-1>", self.click)

                self.results.append(
                    {"file_path": file_path, "line": line_number, "text": text}
                )

            return [file_path, occurrences, line_number]

    def replace(self) -> None:
        """
        Replace all occurrences from the search with new text

        TODO: It looks like files aren't refreshed after the replace happens.
        Opening a file which had contents replaced shows the old contents
        """
        replace_string = self.master.replacebox.get()

        if self.searching:
            self.base.notifications.warning("Please wait for search to complete")
        elif self.replacing:
            self.base.notifications.warning("Already replacing!")
        else:
            self.replacing = True

            if not self.r_matchcase:
                if not self.results:
                    self.label.config(text="Nothing to replace!")

                else:
                    answer = askyesno(
                        "Replace Confirmation",
                        f"Are you sure you want to apply a replace to {len(self.results)} occurrences?",
                    )
                    total = len(self.results)
                    so_far = 0

                    if answer:
                        for item in self.results:
                            so_far += 1

                            self.label.config(
                                text=f"Replacing... {round(round(so_far / total, 2) * 100)}%"
                            )
                            self.base.root.update()

                            with open(item["file_path"], "r", encoding="utf-8") as file:
                                data = file.readlines()
                                data[item["line"] - 1] = data[item["line"] - 1].replace(
                                    item["text"], replace_string
                                )

                            with open(item["file_path"], "w", encoding="utf-8") as file:
                                file.writelines(data)

                        self.label.config(text="Done replacing.")
                        self.clear_tree()
                        self.results = []

            else:
                print("Replace with matchcase! (Not implemented yet)")

            self.replacing = False
