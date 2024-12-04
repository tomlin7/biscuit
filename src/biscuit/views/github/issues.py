import json
import tkinter as tk
import typing
import webbrowser
from tkinter import ttk

import requests

from biscuit.common import ActionSet
from biscuit.common.ui import Scrollbar

from ..sidebar_item import SideBarViewItem


class Issues(SideBarViewItem):
    """View that displays the open issues in a GitHub repository.

    The Issues view displays the open issues in a GitHub repository.
    - The user can click on an issue to open it in the browser.
    """

    def __init__(self, master, itembar=True, *args, **kwargs) -> None:
        self.title = "Open Issues"
        self.__actions__ = ()
        super().__init__(master, itembar=itembar, *args, **kwargs)

        self.url_template = "https://api.github.com/repos/{}/{}/issues"
        self.url = None
        self.owner = None
        self.repo = None

        self.issues = {}

        self.tree = ttk.Treeview(
            self.content,
            selectmode=tk.BROWSE,
            show="tree",
            displaycolumns="",
            columns=("number"),
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

        self.issues_actionset = ActionSet("Search GitHub issues", "issue:", [])
        self.base.palette.register_actionset(lambda: self.issues_actionset)

    def set_url(self, owner: str, repo: str) -> None:
        """Sets the URL for the current repository."""

        self.owner = owner
        self.repo = repo
        self.url = self.url_template.format(owner, repo)

    def on_click(self, *_) -> None:
        """Event handler for treeview item click event."""

        item = self.tree.selection()[0]
        number = self.tree.item(item, "values")[0]
        self.open_editor(number)

    def open_editor(self, number: str) -> None:
        """Opens the issue viewer for the selected issue."""
        from biscuit.git import IssueViewer

        self.base.editorsmanager.add_editor(
            IssueViewer(self.base.editorsmanager, self.issues[number])
        )

    def fetch(self) -> typing.List[dict]:
        """Fetches issues from the current repository."""

        response = requests.get(self.url)
        if response.status_code != 200:
            self.base.notifications.error(
                f"Failed to fetch issues from {self.owner}/{self.repo}"
            )
            self.base.logger.error(
                f"Failed to fetch issues from {self.owner}/{self.repo}: {response.reason} {response.text}"
            )
            return

        issues = json.loads(response.text)
        self.issues = {str(issue["number"]): issue for issue in issues}
        if not issues:
            self.tree.insert("", tk.END, text="No open issues")
            return

        self.issues_actionset.update(
            [
                (
                    f"{issue['title']} #{issue['number']}",
                    lambda *_, number=issue["number"]: self.open_editor(number),
                )
                for issue in issues
                if "pull_request" not in issue
            ]
        )
        issues = (
            (f"{issue['title']} #{issue['number']}", issue["number"])
            for issue in issues
            if "pull_request" not in issue
        )

        self.tree.delete(*self.tree.get_children())
        for issue in issues:
            self.tree.insert("", tk.END, text=issue[0], values=(issue[1],))
