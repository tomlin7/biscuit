from __future__ import annotations

import tkinter as tk
import tkinter.ttk as ttk
import typing

from biscuit.common.icons import Icons
from biscuit.common.ui.hintedentry import Entry
from biscuit.common.ui.native import Frame, Label
from biscuit.common.ui.scrollbar import Scrollbar

from .panelview import PanelView

if typing.TYPE_CHECKING:
    from biscuit.layout.panel import Panel


class GitGraph(PanelView):
    """The Git Graph panel view.

    Displays visual branch graphs, commit history, authors, dates, branches/tags,
    diff stats, and commit search.
    """

    def __init__(self, master: Panel, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.name = "Git Graph"
        self.__icon__ = Icons.GIT_BRANCH
        self.__actions__ = [
            (Icons.REFRESH, self.refresh),
            (Icons.SEARCH, self.focus_search),
        ]

        self.commits: list[dict[str, str]] = []

        self.rowconfigure(1, weight=3)
        self.rowconfigure(2, weight=1)
        self.columnconfigure(0, weight=1)

        # 1. Search bar header
        self.header = Frame(self, **self.base.theme.views.panel.logs)
        self.header.grid(row=0, column=0, columnspan=2, sticky=tk.EW, padx=5, pady=4)
        self.header.columnconfigure(0, weight=1)

        self.search_entry = Entry(self.header, hint="Search commits by message, author, hash, or branch...")
        self.search_entry.grid(row=0, column=0, sticky=tk.EW, padx=(0, 10))
        self.search_entry.bind("<KeyRelease>", self.filter_commits)

        self.count_label = Label(self.header, text="0 commits", **self.base.theme.views.panel.logs)
        self.count_label.grid(row=0, column=1, sticky=tk.E, padx=5)

        # 2. Main Commit Treeview
        tree_frame = Frame(self)
        tree_frame.grid(row=1, column=0, sticky=tk.NSEW)
        tree_frame.rowconfigure(0, weight=1)
        tree_frame.columnconfigure(0, weight=1)

        columns = ("graph", "hash", "refs", "message", "author", "date")
        self.tree = ttk.Treeview(
            tree_frame,
            show="headings",
            columns=columns,
            selectmode=tk.BROWSE,
        )
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)

        self.tree.heading("graph", text="Graph", anchor=tk.W)
        self.tree.heading("hash", text="Commit", anchor=tk.W)
        self.tree.heading("refs", text="Refs", anchor=tk.W)
        self.tree.heading("message", text="Message", anchor=tk.W)
        self.tree.heading("author", text="Author", anchor=tk.W)
        self.tree.heading("date", text="Date", anchor=tk.W)

        self.tree.column("graph", width=90, minwidth=60, stretch=False)
        self.tree.column("hash", width=80, minwidth=70, stretch=False)
        self.tree.column("refs", width=160, minwidth=100, stretch=False)
        self.tree.column("message", width=320, minwidth=150, stretch=True)
        self.tree.column("author", width=120, minwidth=80, stretch=False)
        self.tree.column("date", width=100, minwidth=80, stretch=False)

        self.scrollbar = Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.scrollbar.grid(row=0, column=1, sticky=tk.NS)
        self.tree.config(yscrollcommand=self.scrollbar.set)

        self.tree.bind("<<TreeviewSelect>>", self.on_select)

        # 3. Details pane
        self.details_frame = Frame(self, **self.base.theme.views.panel.logs)
        self.details_frame.grid(row=2, column=0, columnspan=2, sticky=tk.NSEW, padx=5, pady=(2, 5))
        self.details_frame.rowconfigure(0, weight=1)
        self.details_frame.columnconfigure(0, weight=1)

        self.details_text = tk.Text(
            self.details_frame,
            height=4,
            wrap=tk.WORD,
            relief=tk.FLAT,
            padx=8,
            pady=4,
            font=("Consolas", 10),
            **self.base.theme.editors.text,
        )
        self.details_text.grid(row=0, column=0, sticky=tk.NSEW)
        self.details_scrollbar = Scrollbar(self.details_frame, orient=tk.VERTICAL, command=self.details_text.yview)
        self.details_scrollbar.grid(row=0, column=1, sticky=tk.NS)
        self.details_text.config(yscrollcommand=self.details_scrollbar.set)
        self.details_text.insert(tk.END, "Select a commit to view details and changes.")
        self.details_text.config(state=tk.DISABLED)

        # Listen for directory / repo changes
        self.base.bind("<<DirectoryChanged>>", self.refresh, add=True)

    def focus_search(self, *_) -> None:
        self.search_entry.entry.focus_set()

    def get_commit_graph_data(self) -> list[dict[str, str]]:
        if not hasattr(self.base, "git") or not getattr(self.base.git, "repo", None):
            return []

        try:
            repo = self.base.git.repo
            out = repo.git.log(
                "--graph",
                "--all",
                "--date=short",
                "--format=%h%x00%d%x00%an%x00%ad%x00%s",
                "-n",
                "300",
            )
            items: list[dict[str, str]] = []
            for line in out.splitlines():
                parts = line.split("\x00")
                if len(parts) >= 5:
                    first = parts[0]
                    tokens = first.rsplit(" ", 1)
                    if len(tokens) == 2:
                        graph_symbol, commit_hash = tokens[0], tokens[1]
                    else:
                        graph_symbol, commit_hash = "", tokens[0]

                    refs = parts[1].strip(" ()")
                    author = parts[2]
                    date = parts[3]
                    message = parts[4]
                    items.append(
                        {
                            "graph": graph_symbol,
                            "hash": commit_hash,
                            "refs": refs,
                            "message": message,
                            "author": author,
                            "date": date,
                        }
                    )
                elif line.strip():
                    items.append(
                        {
                            "graph": line,
                            "hash": "",
                            "refs": "",
                            "message": "",
                            "author": "",
                            "date": "",
                        }
                    )
            return items
        except Exception:
            return []

    def refresh(self, *_) -> None:
        self.commits = self.get_commit_graph_data()
        self.filter_commits()

    def filter_commits(self, *_) -> None:
        raw = self.search_entry.get()
        query = raw.strip().lower() if isinstance(raw, str) else ""
        self.tree.delete(*self.tree.get_children())
        count = 0

        for item in self.commits:
            if query:
                target = f"{item['hash']} {item['message']} {item['author']} {item['refs']}".lower()
                if query not in target:
                    continue

            self.tree.insert(
                "",
                tk.END,
                values=(
                    item["graph"],
                    item["hash"],
                    item["refs"],
                    item["message"],
                    item["author"],
                    item["date"],
                ),
            )
            if item["hash"]:
                count += 1

        self.count_label.config(text=f"{count} commits" if count != 1 else "1 commit")

    def on_select(self, *_) -> None:
        selected = self.tree.selection()
        if not selected:
            return
        values = self.tree.item(selected[0], "values")
        if not values or len(values) < 6:
            return

        commit_hash = values[1]
        if not commit_hash:
            return

        self.details_text.config(state=tk.NORMAL)
        self.details_text.delete("1.0", tk.END)

        refs_str = f" ({values[2]})" if values[2] else ""
        header_text = f"Commit:  {commit_hash}{refs_str}\nAuthor:  {values[4]}\nDate:    {values[5]}\nSubject: {values[3]}\n\n"
        self.details_text.insert(tk.END, header_text)

        if hasattr(self.base, "git") and getattr(self.base.git, "repo", None):
            try:
                stat = self.base.git.repo.git.show(commit_hash, "--stat", "--oneline")
                lines = stat.splitlines()
                if len(lines) > 1:
                    self.details_text.insert(tk.END, "\n".join(lines[1:]))
            except Exception:
                pass

        self.details_text.config(state=tk.DISABLED)
