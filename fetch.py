import os
import re

import git

URL = re.compile(r"^(?:http)s?://")


class Git(git.Git):
    def clone(self, url: str, dir: str) -> str:
        if not URL.match(url):
            # assumes github as repo host
            url = f"http://github.com/{url}"

        if name := self.repo_name(url):
            dir = os.path.join(dir, name)
            git.Repo(self).clone_from(url, dir)
            return dir

        raise Exception(f"The url `{url}` does not point to a git repo")

    def repo_name(self, url: str) -> None:
        match = re.search(r"/([^/]+?)(\.git)?$", url)
        if match:
            return match.group(1)
