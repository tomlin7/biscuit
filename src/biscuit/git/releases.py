import json

import requests


class Releases:
    """GitHub Releases API (TODO: planned for automation)

    Provides methods to get the latest release, or the latest release for a specific platform
    or a release by tag."""

    def __init__(self, base=None):
        self.base = base

    def get(self, url: str):
        resp = requests.get(url)
        if resp.status_code == 200:
            return json.loads(resp.text)

    def get_latest_release(self, owner: str, repo: str):
        return self.get(f"https://api.github.com/repos/{owner}/{repo}/releases/latest")

    def get_release(self, owner: str, repo: str, tag: str):
        return self.get(
            f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}"
        )

    def get_latest_windows_release(self, owner: str, repo: str):
        resp = self.get_latest_release(owner, repo)
        for asset in resp["assets"]:
            if "-windows-" in asset["name"].lower():
                return asset["browser_download_url"]

    def get_latest_macos_release(self, owner: str, repo: str):
        resp = self.get_latest_release(owner, repo)
        for asset in resp["assets"]:
            if "-mac-" in asset["name"].lower():
                return asset["browser_download_url"]

    def get_latest_linux_release(self, owner: str, repo: str):
        resp = self.get_latest_release(owner, repo)
        for asset in resp["assets"]:
            if "-linux-" in asset["name"].lower():
                return asset["browser_download_url"]

    def get_windows_release(self, owner: str, repo: str, tag: str):
        resp = self.get_release(owner, repo, tag)
        for asset in resp["assets"]:
            if "-windows-" in asset["name"].lower():
                return asset["browser_download_url"]

    def get_macos_release(self, owner: str, repo: str, tag: str):
        resp = self.get_release(owner, repo, tag)
        for asset in resp["assets"]:
            if "-mac-" in asset["name"].lower():
                return asset["browser_download_url"]

    def get_linux_release(self, owner: str, repo: str, tag: str):
        resp = self.get_release(owner, repo, tag)
        for asset in resp["assets"]:
            if "-linux-" in asset["name"].lower():
                return asset["browser_download_url"]
