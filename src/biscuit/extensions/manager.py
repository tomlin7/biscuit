from __future__ import annotations

import errno
import os
import platform
import shutil
import stat
import subprocess
import sys
import threading
import time
import typing
from importlib import util
from pathlib import Path
from queue import Queue

import toml

from .installed import Installed

if typing.TYPE_CHECKING:
    from biscuit import App
    from biscuit.extensions import Extension
    from biscuit.git.repo import GitRepo
    from biscuit.views.extensions.extension import ExtensionGUI

    # type hinting for dynamically loaded extension modules
    from . import extension


class ExtensionManager:
    """Extension manager for Biscuit.

    Manages the loading and execution of extensions.
    """

    def __init__(self, base: App) -> None:
        self.base: App = base
        self.git = self.base.git

        # interval to check if any new extension is queued to run 
        self.interval = 5
        self.extensions_loaded = False

        # attributes related to cloned local repo
        self.extension_dir: Path
        self.extensions_repository: GitRepo = None
        self.extensions_repo_url = "https://github.com/tomlin7/biscuit-extensions"
        self.extensions_list = "extensions_future.toml"
        # this flag marks if extensions repo has already been cloned
        self.repository_available = False

        # extensions that are available to install (from fetched list)
        self.available_extensions: dict[str, str] = {}
        # installed extensions that are available locally
        self.installed = Installed(self)
        # currently loaded extensions
        self.loaded_extensions = {}
        
        self.fetch_queue = Queue()
        self.fetching = threading.Event()
        self.extensions_lock = threading.Lock()

        if p := Path(self.base.extensiondir):
            if p.exists():
                self.extension_dir = p
            else:
                p = Path(self.base.fallback_extensiondir)
                if not p.exists():
                    print("Extensions directory not found.")
                    return
                self.extension_dir = p
 
        self.load_queue: Queue[Path] = Queue()
        sys.path.append(str(self.extension_dir))

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
        """Update the extensions repository.

        Checks if the extensions repository exists locally, clones if not,
        and pulls the latest changes if it does."""

        def update_or_clone_repo(extension_dir: Path) -> None:
            self.repository_available, self.extensions_repository = self.git.check_git(extension_dir)

            if self.repository_available:
                self.extensions_repository.pull()
            else:
                self.extensions_repository = self.git.clone(
                    self.extensions_repo_url,
                    extension_dir,
                    make_folder=False,
                )

            self.available_extensions = toml.load(extension_dir / self.extensions_list)
            self.display_all_extensions()

        try:
            update_or_clone_repo(self.base.extensiondir)
        except Exception as e:
            self.base.logger.error(f"Failed to update extensions repository: {e}")
            try:
                update_or_clone_repo(self.base.fallback_extensiondir)
            except Exception as clone_error:
                self.base.logger.error(
                    f"Failed to update/clone extensions repository: {clone_error}"
                )
                self.base.extensions_view.results.show_placeholder()

    def start_server(self):
        self.queue_installed_extensions()
        self.alive = True
        self.server = threading.Thread(target=self.run_queued_extensions, daemon=True)
        self.server.start()

        self.base.logger.info(f"Extensions server started.")

    def restart_server(self):
        self.loaded_extensions.clear()
        self.queue_installed_extensions()

    def stop_server(self):
        print(f"Extensions server stopped.")
        self.alive = False

    def queue_installed_extensions(self) -> None:
        ext_subdir = self.extension_dir / "extensions"
        if not os.path.isdir(ext_subdir):
            return
        
        # TODO: iterate the available git submodules instead of the directory
        # since we know all the initialized submodules, that would be better

        for ext in ext_subdir.iterdir():
            # id is also the name of the submodule folder
            # so this is a valid check
            if ext.name in self.installed:
                continue
            if not ext.is_dir():
                continue

            self.load_queue.put(ext)

    def run_queued_extensions(self):
        refresh_count = 0
        while self.alive:
            if self.load_queue.empty():
                time.sleep(self.interval)

                self.extensions_loaded = True
                refresh_count += 1
                if refresh_count == 60:
                    self.base.logger.info(
                        f"Extensions server: active, {len(self.installed)} extensions loaded."
                    )
                    refresh_count = 0
                continue

            path = self.load_queue.get()
            name = path.name
            sys.path.append(str(path))

            path = path / "src" / name / "__init__.py"
            module_name = f"src.{name}"

            if not path.exists():
                # submodule is not yet initialized. i.e not installed yet.
                continue

            try:
                spec = util.spec_from_file_location(module_name, path)
                module: extension = util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                if hasattr(module, 'setup'):
                    module.setup(self.base.api)

                self.base.logger.info(f"Extension '{name}' loaded.")
            except Exception as e:
                self.base.logger.error(f"Failed to load extension '{name}': {e}")
                self.base.notifications.error(f"Extension '{name}' failed: see logs.")
                if name in self.installed:
                    self.installed.pop(name)
            finally:
                # remove from PATH to prevent potential conflicts
                if path.is_dir() and str(path) in sys.path:
                    sys.path.remove(str(path))


    def install_extension(self, ext: ExtensionGUI) -> None:
        if ext.installed:
            return

        ext.set_fetching()

        t = threading.Thread(
            target=self.fetch_extension_thread, args=(ext,), daemon=True
        )
        t.start()
        return t

    def fetch_extension_thread(self, ext: ExtensionGUI) -> None:

        if not (ext and ext.submodule_repo):
            print("Extension not found.")
            return

        try:
            # `git submodule update --init extensions/{ext.submodule}`
            ext.submodule_repo.update(init=True, force=True)

            self.installed[ext.id] = ext.data
            self.installed.dump()
            ext.set_installed()  # GUI update

            self.load_extension(ext.id)

            self.base.logger.info(f"Fetching extension '{ext.display_name}' successful.")
            self.base.notifications.info(f"Extension '{ext.display_name}' has been installed!")

        except Exception as e:
            ext.set_unavailable()
            self.base.logger.error(f"Installing extension '{ext.display_name}' failed: {e}")
            self.base.notifications.error(f"Installing '{ext.display_name}' failed.")

    def load_extension(self, ext_id: str) -> None:
        if ext_id:
            # if an extension with same name is already loaded, skip
            if ext_id in self.installed:
                return
            
            self.load_queue.put(self.extension_dir / "extensions" / ext_id)
    
    def uninstall_extension(self, ext: ExtensionGUI) -> None:

        try:
            if not ext.submodule_repo:
                self.base.logger.error(f"Cannot uninstall '{ext.display_name}': not a valid submodule")
                return
            
            # ext.submodule_repo.deinit(force=True)
            # i wish that was a thing, but it's not
            # so we'll have to access git directly
            
            # `git submodule deinit -f -- extensions/{ext.submodule}`
            self.extensions_repository.git.submodule('deinit', '-f', ext.submodule_name)
            
            # `rm -rf .git/modules/extensions/{ext.submodule}`
            module_path = Path(self.extensions_repository.git_dir) / 'modules' / ext.submodule_name
            if module_path.exists():
                if platform.system() == 'Windows':
                    subprocess.run(f'rmdir /s /q "{module_path}"', shell=True, cwd=Path.home())
                else:
                    shutil.rmtree(module_path)
            else:
                self.base.logger.error(f"Module path for '{ext.display_name}' doesn't exist: was this ever initialized?")

            # TODO: because git still holds this empty sm directory, we can't remove it
            # as a result, you can't install -> uninstall -> install the same extension
            # `rmdir /s /q extensions/{ext.submodule}`
            # Path(ext.submodule_repo.abspath).rmdir()

            self.unload_extension(ext.id)
            
            ext.set_uninstalled()
            if ext.id in self.installed:
                self.installed.pop(ext.id)
                self.installed.dump()

            self.base.logger.info(f"Uninstalling extension '{ext.display_name}' successful.")
            self.base.notifications.info(
                f"Extension '{ext.display_name}' has been uninstalled!"
            )
        except Exception as e:
            self.base.logger.error(f"Uninstalling extension '{ext.display_name}' failed.\n{e}")
            self.base.notifications.error(f"Failed to uninstall '{ext.display_name}': {str(e)}")

    def unload_extension(self, ext_id: str):
        # TODO: unload the extension from queue if it's still there
        ...
    
    def check_installed(self, ext: ExtensionGUI) -> bool:
        return ext.partial_id in self.installed

    def open_extension(self, ext: ExtensionGUI) -> None:
        self.base.extension_viewer.show(ext)

    def register_this_installed(self, name: str, extension: Extension) -> None:
        """
        Register an installed extension instance.
        (No particular use case for now, still keeping for future use.)

        NOTE: Called from the extension itself
        """

        self.loaded_extensions[name] = extension
        if hasattr(extension, 'install'):
            extension.install()

    def display_filtered_extensions(self, search_string: str) -> None:
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
        if self.available_extensions:
            self.base.extensions_view.results.show_content()

        for name, data in self.available_extensions.items():
            self.fetch_queue.put((name, data))

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

    # Sandboxed execution was planned but removed due to some issues faced

    # def restricted_import(self, name, globals={}, locals={}, fromlist=[], level=0):
    #     # sandboxed import function
    #     self.blocked_modules = ['os', 'sys']
    #     self.imports = {module: __import__(module) for module in sys.modules}
    #     sys.modules['builtins'].__import__ = self.restricted_import

    #     if name in self.blocked_modules:
    #         raise ImportError("Module '{}' is not allowed.".format(name))

    #     return self.imports[name]

