from __future__ import annotations

import importlib
import json
import os
import threading
import time
import typing
from queue import Queue

import requests

from src.biscuit.views.extensions.extension import Extension

if typing.TYPE_CHECKING:
    from src.biscuit import App


class ExtensionManager:
    """Extension manager for Biscuit.

    Manages the loading and execution of extensions.
    """

    def __init__(self, base: App) -> None:
        self.base = base

        self.extensions_loaded = False

        self.interval = 5
        self.installed = {}

        self.repo_url = (
            "https://raw.githubusercontent.com/tomlin7/biscuit-extensions/main/"
        )
        self.list_url = self.repo_url + "extensions.json"

        self.fetched: dict[str, str] = {}
        self.fetch_queue = Queue()
        self.fetching = threading.Event()
        self.extensions_lock = threading.Lock()

        if not (self.base.extensionsdir and os.path.isdir(self.base.extensionsdir)):
            print("Extensions directory not found.")
            return

        self.load_queue = Queue()
        for extension_file in os.listdir(self.base.extensionsdir):
            if extension_file.endswith(".py"):
                extension_name = os.path.splitext(extension_file)[0]
                if extension_name in self.installed:
                    return
                self.load_queue.put(extension_name)

        self.start_server()

    def install_extension_from_name(self, name: str) -> bool:
        """Install an extension from the repository by name."""

        if name in self.fetched:
            data = self.fetched[name]

            t = self.run_fetch_extension(
                Extension(self.base.extensions_view.results, name, data)
            )
            t.join()

            return True

        return False

    def uninstall_extension_from_name(self, name: str) -> bool:
        """Uninstall an extension by name."""

        if name in self.installed:
            self.remove_extension(self.installed[name])
            return True

        return False

    def find_extension_by_name(self, name: str) -> str:
        """Search for an extension by name."""

        return self.fetched.get(name, None)

    def list_all_extensions(self) -> typing.Generator[tuple[str, str]]:
        """List all extensions."""

        for name, data in self.fetched.items():
            yield name, data

    def list_installed_extensions(self) -> typing.Generator[tuple[str, str]]:
        """List installed extensions."""

        for name in self.installed:
            yield name, self.fetched.get(name, None)

    def list_extensions_by_user(self, user: str) -> typing.Generator[tuple[str, str]]:
        """Show extensions by a specific user."""

        for id, data in self.fetched.items():
            if data[1] == user:
                yield id, data

    def run_fetch_extensions(self, *_) -> None:
        """Called from the Extensions View to fetch extensions."""

        if self.base.testing:
            return

        if self.fetching.is_set():
            self.fetching.wait()

        with self.extensions_lock:
            threading.Thread(target=self.fetch_extensions, daemon=True).start()

    def fetch_extensions(self) -> None:
        """Fetch extensions from Extensions repository."""

        response = None
        try:
            response = requests.get(self.list_url)
        except Exception:
            pass

        # FAIL - network error
        if not response or response.status_code != 200:
            try:
                self.base.extensions_view.results.show_placeholder()
            except:
                ...
            return

        self.fetched = json.loads(response.text)
        # SUCCESS
        if self.fetched:
            try:
                self.base.extensions_view.results.show_content()
            except:
                ...

        for name, data in self.fetched.items():
            # TODO add further loops for folders
            self.fetch_queue.put((name, data))

    def run_fetch_extension(self, ext: Extension) -> None:
        """Called from the Extension View to fetch an extension."""

        if ext.installed:
            return

        ext.set_fetching()

        t = threading.Thread(target=self.fetch_extension, args=(ext,), daemon=True)
        t.start()
        return t

    def fetch_extension(self, ext: Extension) -> None:
        """Fetch an extension from the repository."""

        try:
            response = requests.get(ext.url)
            if response.status_code == 200:
                self.save_extension(ext, response)
        except:
            ext.set_unavailable()

    def save_extension(self, ext: Extension, response: requests.Response) -> None:
        """Save a fetched extension. Saves the extension and loads it."""

        with open(ext.file, "w") as fp:
            fp.write(response.text)

        self.load_extension(ext.filename)
        ext.set_installed()

        self.base.logger.info(f"Fetching extension '{ext.name}' successful.")
        self.base.notifications.info(f"Extension '{ext.name}' has been installed!")

    def remove_extension(self, ext: Extension) -> None:
        """Remove an extension from the system."""

        try:
            os.remove(ext.file)
            self.unload_extension(ext.filename)

            ext.set_uninstalled()

            self.base.logger.info(f"Uninstalling extension '{ext.name}' successful.")
            self.base.notifications.info(
                f"Extension '{ext.name}' has been uninstalled!"
            )
        except Exception as e:
            self.base.logger.error(f"Uninstalling extension '{ext.name}' failed.\n{e}")

    def load_extension(self, file: str):
        """Load an extension from a file."""

        if file.endswith(".py"):
            extension_name = os.path.splitext(file)[0]

            # if an extension with same name is already loaded, skip
            if extension_name in self.installed:
                return
            self.load_queue.put(extension_name)

    def unload_extension(self, file: str):
        """Unload an extension from a file."""

        if file.endswith(".py"):
            file = os.path.splitext(file)[0]

        if file in self.installed:
            self.installed.pop(file)

    def load_extensions(self):
        """Not to be called directly. Use `start_server` instead."""

        refresh_count = 0
        while self.alive:
            if self.load_queue.empty():
                self.extensions_loaded = True
                time.sleep(self.interval)

                refresh_count += 1
                if refresh_count == 10:
                    self.base.logger.info(
                        f"Extensions server: active, {len(self.installed)} extensions loaded."
                    )
                    refresh_count = 0
                continue

            ext = self.load_queue.get()
            module_name = f"extensions.{ext}"
            try:
                extension_module = importlib.import_module(module_name)
                extension_instance = extension_module.Extension(self.base.api)
                self.installed[ext] = extension_instance

                try:
                    extension_instance.run()
                except:
                    # normally because no `run` method defined.
                    pass

                self.base.logger.info(f"Extension '{ext}' loaded.")
            except ImportError as e:
                self.base.logger.error(f"Failed to load extension '{ext}': {e}")
                self.base.notifications.error(f"Extension '{ext}' failed: see logs.")
                if ext in self.installed:
                    self.installed.pop(ext)

    def start_server(self):
        self.server = threading.Thread(target=self.load_extensions, daemon=True)
        self.alive = True
        self.server.start()

        self.base.logger.info(f"Extensions server started.")

    def restart_server(self):
        self.alive = False
        self.base.after(1000, self.start_server)

    def stop_server(self):
        print(f"Extensions server stopped.")
        self.alive = False

    # def restricted_import(self, name, globals={}, locals={}, fromlist=[], level=0):
    #     # sandboxed import function
    #     self.blocked_modules = ['os', 'sys']
    #     self.imports = {module: __import__(module) for module in sys.modules}
    #     sys.modules['builtins'].__import__ = self.restricted_import

    #     if name in self.blocked_modules:
    #         raise ImportError("Module '{}' is not allowed.".format(name))

    #     return self.imports[name]
