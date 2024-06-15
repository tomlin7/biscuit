from __future__ import annotations

import os
import typing
from ast import Tuple

import git
import git.exc

if typing.TYPE_CHECKING:
    from .git import Git


class GitRepo(git.Repo):
    """Git Repository

    This class is a wrapper around the `git.Repo` class to manage git repositories and branches.
    """

    def __init__(self, master: Git = None, path=None, *args, **kwargs) -> None:
        super().__init__(path, *args, **kwargs)
        self.master = master
        try:
            self.base = master.base
        except AttributeError:
            self.base = master

        self.path = path
        self.config = self.config_reader()

        self.author_name = self.config.get_value("user", "name")
        self.author_email = self.config.get_value("user", "email")
        self.author = git.Actor(self.author_name, self.author_email)

    def switch_to_branch(self, branch: git.Head):
        self.git.checkout(str(branch))
        self.master.update_repo_info()
        self.base.statusbar.update_git_info()
        self.base.explorer.directory.refresh_root()

    def create_branch(self, branch: str):
        if not branch:
            self.base.notifications.error("Branch name cannot be empty")
            return

        self.create_head(branch.strip())
        self.switch_to_branch(branch)

    def get_untracked_files(self) -> list:
        return list(self.untracked_files)

    def get_added_files(self) -> list:
        return [item.a_path for item in self.index.diff(None).iter_change_type("A")]

    def get_deleted_files(self) -> list:
        return [item.a_path for item in self.index.diff(None).iter_change_type("D")]

    def get_modified_files(self) -> list:
        return [item.a_path for item in self.index.diff(None).iter_change_type("M")]

    def get_staged_added_files(self) -> list:
        return [item.a_path for item in self.index.diff("HEAD").iter_change_type("D")]

    def get_staged_deleted_files(self) -> list:
        return [item.a_path for item in self.index.diff("HEAD").iter_change_type("A")]

    def get_staged_modified_files(self) -> list:
        return [item.a_path for item in self.index.diff("HEAD").iter_change_type("M")]

    def get_latest_commit(self):
        return self.head.commit

    def get_commit_filedata(self, filename) -> str:
        return self.head.commit.tree[filename].data_stream.read().decode("utf-8")

    def stage_files(self, *paths: Tuple[str, int]) -> None:
        """Stage files to be committed

        Change types:
        0: Deleted
        1: Added
        2: Modified
        3: Untracked

        Args:
            *paths (Tuple[path, change_type]): A list of paths and their change types"""

        for path, change_type in paths:
            # change type can be      0,       1,     2,        3
            # respectively represents Deleted, Added, Modified, Untracked
            if change_type == 0:
                self.do(self.index.remove, [path])
            else:
                self.do(self.index.add, [path])

    def unstage_files(self, *paths: str) -> None:
        self.index.reset(paths=paths)

    def discard_changes(self, *paths: str) -> None:
        try:
            self.git.checkout("--", *paths)
        except git.exc.GitCommandError as e:
            for path in paths:
                if path in self.get_untracked_files():
                    os.remove(path)

    def commit_files(self, message="", **kwargs):
        if not message:
            message = "Commit changes"

        return self.index.commit(message, author=self.author, **kwargs)

    def push_files(self, remote="origin", branch="", **kwargs):
        if not branch:
            branch = self.active_branch.name
        return self.do(self.remotes[remote].push, branch, **kwargs)

    def pull_files(self, remote="", branch="", **kwargs):
        if not remote:
            remote = "origin"
        if not branch:
            branch = self.active_branch.name
        return self.do(self.remotes[remote].pull, branch, **kwargs)

    def do(self, fn, *args, **kwargs):
        # error handling
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            self.base.notifications.error(e)
            self.base.logger.error(e)

    def get_remote(self, name):
        return self.remotes[name]

    def get_remote_origin(self):
        return self.get_remote("origin")

    def get_remote_url(self, name):
        return self.strip_github_url(self.get_remote(name).url)

    def get_remote_origin_url(self):
        return self.get_remote_url("origin")

    def strip_github_url(self, url):
        if url.endswith(".git"):
            url = url[:-4]
        return url

    def get_owner_and_repo(self, url):
        url = self.strip_github_url(url).split("/")
        if len(url) == 2:
            # SSH url (git@github.com:username/repo.git)
            return url[0].split(":")[1], url[1]
        return url[-2], url[-1]

    # TODO: push, pull, fetch
    def get_active_branch(self):
        return self.active_branch.name
