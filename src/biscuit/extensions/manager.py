from __future__ import annotations

import os
import sys
import threading
import time
import typing
from importlib import util
from pathlib import Path
from queue import Queue

import toml

from biscuit.extensions.installed import Installed

if typing.TYPE_CHECKING:
    from biscuit import App
    from biscuit.git.repo import GitRepo
    from biscuit.views.extensions.extension import ExtensionGUI

    from . import extension


class ExtensionManager:
    """Extension manager for Biscuit.

    Manages the loading and execution of extensions.
    """

    def __init__(self, base: App) -> None:
        self.base: App = base
        self.git = self.base.git

        self.extensions_loaded = False

        self.interval = 5

        # fetching
        self.repository_available = False
        self.extensions_repository: GitRepo = None
        self.extensions_repo_url = "https://github.com/tomlin7/biscuit-extensions"
        self.extensions_list = "extensions_future.toml"
        self.installed = Installed(self)

        self.available_extensions: dict[str, str] = {}
        self.fetch_queue = Queue()
        self.fetching = threading.Event()
        self.extensions_lock = threading.Lock()

        # running extensions
        self.loaded_extensions = {}

        if not (
            self.base.extensiondir and os.path.isdir(self.base.extensiondir)
        ) or not (
            self.base.fallback_extensiondir
            and os.path.isdir(self.base.fallback_extensiondir)
        ):
            print("Extensions directory not found.")
            return

        self.load_queue = Queue()

    def start_server(self):
        self.queue_installed_extensions()
        self.alive = True
        self.server = threading.Thread(target=self.load_extensions, daemon=True)
        self.server.start()

        self.base.logger.info(f"Extensions server started.")

    def restart_server(self):
        self.loaded_extensions.clear()
        self.queue_installed_extensions()

    def stop_server(self):
        print(f"Extensions server stopped.")
        self.alive = False

    # CLI commands ----------------

    def install_extension_from_name(self, name: str) -> bool:
        """Install an extension from the repository by name."""

        if name in self.available_extensions:
            data = self.available_extensions[name]

            from biscuit.views.extensions.extension import ExtensionGUI

            t = self.install_extension(
                ExtensionGUI(self.base.extensions_view.results, name, data)
            )
            t.join()

            return True

        return False

    def uninstall_extension_from_name(self, name: str) -> bool:
        """Uninstall an extension by name."""

        if name in self.installed:
            self.uninstall_extension(self.installed[name])
            return True

        return False

    def find_extension_by_name(self, name: str) -> str:
        """Search for an extension by name."""

        return self.available_extensions.get(name, None)

    def list_all_extensions(self) -> typing.Generator[tuple[str, str]]:
        """List all extensions."""

        for name, data in self.available_extensions.items():
            yield name, data

    def list_installed_extensions(self) -> typing.Generator[tuple[str, str]]:
        """List installed extensions."""

        for name in self.installed:
            yield name, self.available_extensions.get(name, None)

    def list_extensions_by_user(self, user: str) -> typing.Generator[tuple[str, str]]:
        """Show extensions by a specific user."""

        for id, data in self.available_extensions.items():
            if data[1] == user:
                yield id, data

    # core functions ----------------

    def run_fetch_extensions(self, *_) -> None:
        """Called from the Extensions View to fetch extensions."""

        if self.base.testing:
            return

        if self.fetching.is_set():
            self.fetching.wait()

        with self.extensions_lock:
            threading.Thread(
                target=self.update_extension_repository, daemon=True
            ).start()

    def update_extension_repository(self) -> bool:
        """
        Update the extensions repository.

        Checks if the extensions repository exists locally, clones if not,
        and pulls the latest changes if it does.
        """

        try:
            self.repository_available, self.extensions_repository = self.git.check_git(
                self.base.fallback_extensiondir
            )

            if self.repository_available:
                self.extensions_repository.pull()
            else:
                self.extensions_repository = self.git.clone(
                    self.extensions_repo_url,
                    self.base.fallback_extensiondir,
                    make_folder=False,
                )

            self.available_extensions = toml.load(
                Path(self.base.fallback_extensiondir) / self.extensions_list
            )

            self.display_all_extensions()

        except Exception as e:
            print(f"Failed to update extensions repository: {e}")
            try:
                self.repository_available, self.extensions_repository = (
                    self.git.check_git(self.base.extensiondir)
                )

                if self.repository_available:
                    self.extensions_repository.pull()
                else:
                    self.extensions_repository = self.git.clone(
                        self.extensions_repo_url,
                        self.base.extensiondir,
                        make_folder=False,
                    )

                self.available_extensions = toml.load(
                    Path(self.base.extensiondir) / self.extensions_list
                )

                self.display_all_extensions()

            except Exception as clone_error:
                self.base.logger.error(
                    f"Failed to update/clone extensions repository: {clone_error}"
                )
                self.base.extensions_view.results.show_placeholder()

    def display_filtered_extensions(self, search_string: str) -> None:
        """Display filtered extensions from the repository in the Extensions View."""

        if self.available_extensions:
            self.base.extensions_view.results.show_content()

        if not search_string:
            for name, data in self.available_extensions.items():
                self.fetch_queue.put((name, data))
        else:
            for name, data in self.available_extensions.items():
                if search_string.lower() in name:
                    self.fetch_queue.put((name, data))

    def display_all_extensions(self) -> None:
        """Display all extensions from the repository in the Extensions View."""

        if self.available_extensions:
            self.base.extensions_view.results.show_content()

        for name, data in self.available_extensions.items():
            self.fetch_queue.put((name, data))

    def install_extension(self, ext: ExtensionGUI) -> None:
        """Called from the Extension View to fetch an extension."""

        if ext.installed:
            return

        ext.set_fetching()

        t = threading.Thread(
            target=self.fetch_extension_thread, args=(ext,), daemon=True
        )
        t.start()
        return t

    def fetch_extension_thread(self, ext: ExtensionGUI) -> None:
        # 1. git submodule update --init extensions/{ext.submodule}

        if not (ext and ext.submodule_repo):
            print("Extension not found.")
            return

        # try:
        # Deprecated in favor of git submodules (v3.0.0)

        # response = requests.get(ext.url)
        # if response.status_code == 200:
        #     with open(ext.file, "w") as fp:
        #         fp.write(response.text)

        # I forgot what i was doing at this point

        # self.extensions_repository.submodule_update(
        #     ext.submodule_name, ext.submodule_repo
        # )

        # edit: i guess this is easier
        ext.submodule_repo.update(init=True, force=True)

        print("executed")
        ext.set_installed()
        self.installed[ext.name] = ext.data

        # self.load_extension(ext)

        self.base.logger.info(f"Fetching extension '{ext.name}' successful.")
        self.base.notifications.info(f"Extension '{ext.name}' has been installed!")

        # except Exception as e:
        #     ext.set_unavailable()
        #     self.base.logger.error(f"Installing extension '{ext.name}' failed: {e}")
        #     self.base.notifications.error(f"Installing extension '{ext.name}' failed.")

    def uninstall_extension(self, ext: ExtensionGUI) -> None:
        """Remove an extension from the system."""

        # 1. git submodule deinit -f -- a/submodule
        # 2. rm -rf .git/modules/a/submodule
        # 3. git rm -f a/submodule

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

    def open_extension(self, ext: ExtensionGUI) -> None:
        """Open extension details."""

        self.base.extension_viewer.show(ext)

    def load_extension(self, file: str):
        """Load an extension from a file."""

        if file.endswith(".py"):
            extension_name = os.path.basename(file).split(".")[0]

            # if an extension with same name is already loaded, skip
            if extension_name in self.installed:
                return
            self.load_queue.put((extension_name, file))

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
                if refresh_count == 60:
                    self.base.logger.info(
                        f"Extensions server: active, {len(self.installed)} extensions loaded."
                    )
                    refresh_count = 0
                continue

            ext, path = self.load_queue.get()
            path = Path(path)
            module_name = f"extensions.{ext}"
            try:
                extension_path = path
                module_name = f"extensions.{ext}"

                if path.is_dir():
                    extension_path = path / "extension.py"
                    sys.path.insert(0, str(path))

                # TODO support for multiple files
                spec = util.spec_from_file_location(module_name, str(extension_path))
                extension_module: extension = util.module_from_spec(spec)

                spec.loader.exec_module(extension_module)
                # execute the setup function
                extension_module.setup(self.base.api)

                self.base.logger.info(f"Extension '{ext}' loaded.")
            except Exception as e:
                self.base.logger.error(f"Failed to load extension '{ext}': {e}")
                self.base.notifications.error(f"Extension '{ext}' failed: see logs.")
                if ext in self.installed:
                    self.installed.pop(ext)
            finally:
                # remove extension directory to prevent potential conflicts
                if path.is_dir() and str(path) in sys.path:
                    sys.path.remove(str(path))

    def register_this_installed(self, name: str, extension: object) -> None:
        """Register an installed extension instance.
        (No particular use case for now, still keeping for future use.)

        NOTE: Called from the extension itself
        """

        self.loaded_extensions[name] = extension
        try:
            extension.install()
        except Exception as e:
            print(e)
            # most likely the extension object does not follow standard
            # still allow the extension to be registered
            ...

    def queue_installed_extensions(self) -> None:
        def load_extension(dir: str):
            if not os.path.isdir(dir):
                return

            for extension_file in os.listdir(dir):
                if extension_file.endswith(".py") or extension_file == "foo":
                    extension_name = os.path.basename(extension_file).split(".")[0]
                    if extension_name in self.installed:
                        return

                    self.load_queue.put((extension_name, Path(dir) / extension_file))

        load_extension(self.base.extensiondir)
        load_extension(self.base.fallback_extensiondir)

    # Sandboxed execution was planned but removed due to some issues faced

    # def restricted_import(self, name, globals={}, locals={}, fromlist=[], level=0):
    #     # sandboxed import function
    #     self.blocked_modules = ['os', 'sys']
    #     self.imports = {module: __import__(module) for module in sys.modules}
    #     sys.modules['builtins'].__import__ = self.restricted_import

    #     if name in self.blocked_modules:
    #         raise ImportError("Module '{}' is not allowed.".format(name))

    #     return self.imports[name]
