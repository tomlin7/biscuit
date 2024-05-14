import json
import tkinter as tk
import typing
import webbrowser
from tkinter import ttk

import requests

from biscuit.core.components.floating.palette.actionset import ActionSet
from biscuit.core.utils.scrollbar import Scrollbar

from ..item import SidebarViewItem


class Issues(SidebarViewItem):
    def __init__(self, master, itembar=True, *args, **kwargs) -> None:
        self.title = 'Open Issues'
        self.__buttons__ = ()
        super().__init__(master, itembar=itembar, *args, **kwargs)

        self.url_template = "https://api.github.com/repos/{}/{}/issues"
        self.url = None
        self.owner = None
        self.repo = None

        self.tree = ttk.Treeview(self.content, selectmode=tk.BROWSE, 
                                 show="tree", displaycolumns='', columns=("link"))
        self.tree.grid(row=0, column=0, sticky=tk.NSEW)
        self.tree.bind("<Double-Button-1>", self.on_click)

        self.scrollbar = Scrollbar(self.content, style='TreeScrollbar', orient=tk.VERTICAL, command=self.tree.yview)
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
        
        try:
            item = self.tree.selection()[0]
            link = self.tree.item(item, "values")[0]
            webbrowser.open(link)
        except Exception as e:
            pass
    
    def fetch(self) -> typing.List[dict]:
        """Fetches issues from the current repository."""
        
        response = requests.get(self.url)
        if response.status_code != 200:
            self.base.notifications.error(f"Failed to fetch issues from {self.owner}/{self.repo}")
            return
        
        issues = json.loads(response.text)
        if not issues:
            self.tree.insert('', tk.END, text="No open issues")
            return
        
        self.issues_actionset.update([(f"{issue['title']} #{issue['number']}", lambda *_, link=issue['html_url']: webbrowser.open(link)) for issue in issues if 'pull_request' not in issue])
        issues = ((f"{issue['title']} #{issue['number']}", issue['html_url']) for issue in issues if 'pull_request' not in issue)

        self.tree.delete(*self.tree.get_children())
        for issue in issues:
            self.tree.insert('', tk.END, text=issue[0], values=(issue[1],))
