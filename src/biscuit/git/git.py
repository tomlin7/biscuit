from __future__ import annotations

import os
import re
import typing
from tkinter import messagebox

import git.repo

from ..common import ActionSet

if typing.TYPE_CHECKING:
    from src import App

git_available = True
try:
    import git

    from .ignore import GitIgnore
    from .repo import GitRepo
except ImportError:
    messagebox.showerror(
        "Git not found",
        "Git is not installed on your PC. Install and add Git to the PATH to use Biscuit",
    )
    git_available = False

URL = re.compile(r"^(?:http)s?://")


# TODO: Many git functions are not implemented yet
class Git(git.Git):
    """Git Integration

    This class is a wrapper around the `git.Git` class to manage git repositories and branches.
    """

    def __init__(self, master: App, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.base = master
        self.repo: GitRepo = None
        self.ignore = GitIgnore(self)
        self.branches = {}

        self.actionset = ActionSet(
            "Manage git branches",
            "branch:",
            self.branches,
            pinned=[
                [
                    "Create new branch: {}",
                    lambda branch=None: self.repo.create_branch(branch),
                ]
            ],
        )

    def late_setup(self) -> None:
        """This function is called after the app is initialized."""

        if not git_available:
            self.base.notifications.warning(
                "Git not found in PATH, git features are disabled"
            )
            self.base.logger.warning("Git not found in PATH, git features are disabled")
            return

        self.base.palette.register_actionset(lambda: self.actionset)

    def check_git(self, dir: str) -> tuple[bool, GitRepo]:
        """Check if git is installed and the directory is a git repository

        Returns:
            (bool, GitRepo): Tuple of success bool and GitRepo object
        """

        if not dir:
            dir = self.base.active_directory

        if not (git_available and dir):
            return False, None

        try:
            repo = GitRepo(self, dir)
            self.ignore.load()

        except Exception as e:  # git.exc.InvalidGitRepositoryError
            return False, None

        return True, repo

    def update_repo_info(self) -> None:
        """Update the branches in the repository and add them to the actionset
        This function is called when the repository is changed or when the branches are updated.
        """

        if not git_available:
            return

        self.branches = {}

        for branch in self.repo.branches:
            latest_commit = next(self.repo.iter_commits(branch))
            self.branches[branch] = latest_commit.committed_datetime
        self.branches = sorted(self.branches.items(), key=lambda x: x[1], reverse=True)

        # TODO: make use of the commit_time in palette items
        self.actionset.update(
            [
                (str(branch), lambda e=None, b=branch: self.repo.switch_to_branch(b))
                for branch, commit_time in self.branches
            ]
        )

    def get_version(self) -> str:
        if not git_available:
            return

        return self.version()

    @property
    def active_branch(self) -> str:
        if not git_available:
            return

        return self.repo.active_branch

    def checkout(self, branch: str) -> None:
        if not git_available:
            return

        self.repo.index.checkout(branch)
        self.base.notifications.info(f"Checked out branch {branch}")
        self.base.logger.info(f"Checked out branch {branch}")

    def clone(self, url: str, dir: str, make_folder=True) -> GitRepo:
        """Clone a git repository to the specified directory

        Args:
            url (str): The url of the git repository
            dir (str): The directory to clone the repository to

        Returns:
            str: The path to the cloned repository"""

        if not URL.match(url):
            # assumes github as host
            url = f"http://github.com/{url}"

        if make_folder and (name := self.repo_name(url)):
            dir = os.path.join(dir, name)

        repo = GitRepo().clone_from(url, dir)
        return repo

        # raise Exception(f"The url `{url}` does not point to a git repo")

    def repo_name(self, url: str) -> None:
        match = re.search(r"/([^/]+?)(\.git)?$", url)
        if match:
            return match.group(1)
