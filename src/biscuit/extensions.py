from __future__ import annotations

import importlib
import json
import os
import threading
import time
import typing
from queue import Queue

import requests

if typing.TYPE_CHECKING:
    from src.biscuit import App
    from src.biscuit.views.extensions.extension import Extension


class ExtensionManager:
    """Extension manager for Biscuit.

    Manages the loading and execution of extensions.
    """

    def __init__(self, base: App) -> None:
        self.base = base

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
        except Exception as e:
            pass

        # FAIL - network error
        if not response or response.status_code != 200:
            self.base.extensions_view.results.show_placeholder()
            return

        self.fetched = json.loads(response.text)
        # SUCCESS
        if self.fetched:
            self.base.extensions_view.results.show_content()

        for name, data in self.fetched.items():
            # TODO add further loops for folders
            self.fetch_queue.put((name, data))

    def run_fetch_extension(self, ext: Extension) -> None:
        """Called from the Extension View to fetch an extension."""

        if ext.installed:
            return

        threading.Thread(target=self.fetch_extension, args=(ext,), daemon=True).start()

    def fetch_extension(self, ext: Extension) -> None:
        """Fetch an extension from the repository."""

        try:
            response = requests.get(ext.url)
            print(response)
            if response.status_code == 200:
                self.install_extension(ext, response)
        except:
            ext.set_unavailable()

    def install_extension(self, ext: Extension, response: requests.Response) -> None:
        """Install a fetched extension. Saves the extension and loads it."""

        with open(ext.file, "w") as fp:
            fp.write(response.text)

        ext.set_installed()

        self.base.logger.info(f"Fetching extension '{ext.name}' successful.")
        self.base.notifications.info(f"Extension '{ext.name}' has been installed!")

        self.load_extension(ext.filename)

    def remove_extension(self, ext: Extension) -> None:
        """Remove an extension from the system."""

        try:
            os.remove(ext.file)

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

    def load_extensions(self):
        """Not to be called directly. Use `start_server` instead."""

        refresh_count = 0
        while self.alive:
            if self.load_queue.empty():
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
