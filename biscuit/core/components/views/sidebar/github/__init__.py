import os
import threading
import tkinter as tk

from biscuit.core.components.floating.palette import ActionSet

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
        self.add_item(self.issues)

        self.prs = PRs(self)
        self.add_item(self.prs)

        self.base.bind("<<DirectoryChanged>>", self.on_directory_change, add=True)

    def on_directory_change(self, e) -> None:
        """Event handler for directory change event."""
        
        if not self.base.git_found:
            return
        
        repo = self.git.repo
        remote = repo.get_remote_origin()
        if not remote:
            self.base.notifications.error("No remote found for repository.")
            return
        
        if not "github.com" in remote.url:
            self.base.notifications.info("Remote is not a GitHub repository.")
            return
        
        try:
            owner, repo_name = repo.get_owner_and_repo(remote.url)
            self.issues.set_url(owner, repo_name)
            self.prs.set_url(owner, repo_name)
        except Exception as e:
            self.base.notifications.error(f"Failed to fetch remote info.")
            self.base.logger.error(f"Failed to fetch remote info: {e}")
            return
        
        threading.Thread(target=self.fetch_issues_and_prs, daemon=True).start()

    def fetch_issues_and_prs(self) -> None:
        """Fetches issues and PRs from the current repository."""
        
        self.issues.fetch()
        self.prs.fetch()

    # def toggle_active_editors(self):
    #     if self.active_editors_visible:
    #         self.open_editors.pack_forget()
    #     else:
    #         self.open_editors.pack(fill=tk.X, before=self.directory)
    #     self.active_editors_visible = not self.active_editors_visible
