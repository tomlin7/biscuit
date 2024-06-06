import threading
import tkinter as tk

from src.biscuit.common.ui import WrappingLabel

from ..drawer_view import NavigationDrawerView
from .issues import Issues
from .menu import GitHubMenu
from .prs import PRs


class GitHub(NavigationDrawerView):
    """View that displays the GitHub issues and pull requests.

    The GitHub view displays the issues and pull requests from the active GitHub repository.
    """

    def __init__(self, master, *args, **kwargs) -> None:
        self.__buttons__ = [("refresh", self.on_directory_change)]
        super().__init__(master, *args, **kwargs)
        self.__icon__ = "github"
        self.name = "GitHub"

        self.menu = GitHubMenu(self, "files")
        self.menu.add_checkable("Open Issues", self.toggle_issues, checked=True)
        self.menu.add_checkable("Pull Requests", self.toggle_prs, checked=True)
        self.add_action("ellipsis", self.menu.show)

        self.issues_enabled = True
        self.prs_enabled = True

        self.git = self.base.git
        self.issues = Issues(self)
        self.prs = PRs(self)

        self.placeholder = WrappingLabel(
            self,
            text="Open a GitHub repository to see issues & pull requests.",
            font=self.base.settings.uifont,
            **self.base.theme.utils.label,
        )
        self.placeholder.pack(fill=tk.X, side=tk.TOP)

        self.base.bind("<<DirectoryChanged>>", self.on_directory_change, add=True)

    def on_directory_change(self, e) -> None:
        """Event handler for directory change event."""

        if not (self.base.active_directory and self.base.git_found):
            self.show_placeholder(
                "Open a GitHub repository to see issues & pull requests."
            )
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
        if self.issues_enabled:
            self.issues.pack(fill=tk.BOTH, expand=True)
        if self.prs_enabled:
            self.prs.pack(fill=tk.BOTH, expand=True)

    def toggle_issues(self) -> None:
        """Toggles the visibility of the issues view."""

        if self.issues_enabled:
            self.issues.pack_forget()
        else:
            self.issues.pack(fill=tk.BOTH, expand=True)
        self.issues_enabled = not self.issues_enabled

    def toggle_prs(self) -> None:
        """Toggles the visibility of the PRs view."""

        if self.prs_enabled:
            self.prs.pack_forget()
        else:
            self.prs.pack(fill=tk.BOTH, expand=True)
        self.prs_enabled = not self.prs_enabled
