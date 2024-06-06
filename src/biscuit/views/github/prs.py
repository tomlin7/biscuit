import json
import tkinter as tk
import typing
import webbrowser
from tkinter import ttk

import requests

from src.biscuit.common import ActionSet
from src.biscuit.common.ui import Scrollbar

from ..drawer_item import NavigationDrawerViewItem


class PRs(NavigationDrawerViewItem):
    """View that displays the open pull requests in a GitHub repository.

    The PRs view displays the open pull requests in a GitHub repository.
    - The user can click on a PR to open it in the browser.
    """

    def __init__(self, master, itembar=True, *args, **kwargs) -> None:
        self.title = "Pull Requests"
        self.__buttons__ = ()
        super().__init__(master, itembar=itembar, *args, **kwargs)

        self.url_template = "https://api.github.com/repos/{}/{}/pulls"
        self.url = None

        self.tree = ttk.Treeview(
            self.content,
            selectmode=tk.BROWSE,
            show="tree",
            displaycolumns="",
            columns=("link"),
        )
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree.bind("<Double-Button-1>", self.on_click)

        self.scrollbar = Scrollbar(
            self.content,
            style="TreeScrollbar",
            orient=tk.VERTICAL,
            command=self.tree.yview,
        )
        self.scrollbar.grid(row=0, column=1, sticky=tk.NS)
        self.tree.config(yscrollcommand=self.scrollbar.set)

        self.prs_actionset = ActionSet("Search GitHub pull requests", "pr:", [])
        self.base.palette.register_actionset(lambda: self.prs_actionset)

    def set_url(self, owner: str, repo: str) -> None:
        """Sets the URL for the current repository."""

        self.owner = owner
        self.repo = repo
        self.url = self.url_template.format(owner, repo)

    def on_click(self, *_) -> None:
        """Event handler for treeview item click event."""

        try:
            item = self.tree.selection()[0]
            link = self.tree.item(item, "values")[0]
            webbrowser.open(link)
        except Exception as e:
            pass

    def fetch(self) -> typing.List[dict]:
        """Fetches prs from the current repository."""

        response = requests.get(self.url)
        if response.status_code != 200:
            self.base.notifications.error(
                f"Failed to fetch PRs from {self.owner}/{self.repo}"
            )
            return

        prs = json.loads(response.text)
        if not prs:
            self.tree.insert("", tk.END, text="No open pull requests")
            return

        self.prs_actionset.update(
            [
                (
                    f"{pr['title']} #{pr['number']}",
                    lambda *_, link=pr["html_url"]: webbrowser.open(link),
                )
                for pr in prs
            ]
        )
        prs = ((f"{pr['title']} #{pr['number']}", pr["html_url"]) for pr in prs)

        self.tree.delete(*self.tree.get_children())
        for pr in prs:
            self.tree.insert("", tk.END, text=pr[0], values=(pr[1],))
