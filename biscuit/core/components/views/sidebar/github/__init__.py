import os
import threading
import tkinter as tk

from biscuit.core.components.floating.palette import ActionSet
from biscuit.core.utils.label import WrappingLabel

from ..sidebarview import SidebarView
from .issues import Issues
from .prs import PRs


class GitHub(SidebarView):
    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = []
        super().__init__(master, *args, **kwargs)
        self.__icon__ = 'github'
        self.name = 'GitHub'

        # self.menu = ExplorerMenu(self, 'files')
        # self.menu.add_checkable("Open Editors", self.toggle_active_editors, checked=True)
        # self.menu.add_checkable("Search", self.base.commands.show_file_search)
        # self.add_button('ellipsis', self.menu.show)

        self.git = self.base.git

        self.issues = Issues(self)
        self.prs = PRs(self)

        self.placeholder = WrappingLabel(self, text="Open a GitHub repository to see issues & pull requests.", font=self.base.settings.uifont,
                                    **self.base.theme.utils.label)
        self.placeholder.pack(fill=tk.X, side=tk.TOP)        

        self.base.bind("<<DirectoryChanged>>", self.on_directory_change, add=True)

    def on_directory_change(self, e) -> None:
        """Event handler for directory change event."""

        if not (self.base.active_directory and self.base.git_found):
            self.show_placeholder("Open a GitHub repository to see issues & pull requests.")
            return
        
        repo = self.git.repo
        remote = repo.get_remote_origin()
        if not remote:
            self.base.notifications.info("No remote found.")
            self.show_placeholder("No remote found.")
            return
        
        if not "github.com" in remote.url:
            self.base.notifications.info("Remote is not a GitHub repository.")
            self.show_placeholder("Remote is not a GitHub repository.")
            return
        
        try:
            owner, repo_name = repo.get_owner_and_repo(remote.url)
            self.issues.set_url(owner, repo_name)
            self.prs.set_url(owner, repo_name)
        except Exception as e:
            self.base.notifications.error(f"Failed to fetch remote info.")
            self.base.logger.error(f"Failed to fetch remote info: {e}")
            self.show_placeholder("Failed to fetch remote info.")
            return
        
        self.show_content()
        threading.Thread(target=self.fetch_issues_and_prs, daemon=True).start()

    def fetch_issues_and_prs(self) -> None:
        """Fetches issues and PRs from the current repository."""
        
        self.issues.fetch()
        self.prs.fetch()

    def show_placeholder(self, text: str) -> None:
        """Adds a placeholder label to the view."""
        
        self.issues.pack_forget()
        self.prs.pack_forget()
        self.placeholder.config(text=text)
        self.placeholder.pack(fill=tk.X, side=tk.TOP)

    def show_content(self) -> None:
        """Shows the content of the view."""
        
        self.placeholder.pack_forget()
        self.issues.pack(fill=tk.BOTH, expand=True)
        self.prs.pack(fill=tk.BOTH, expand=True)
