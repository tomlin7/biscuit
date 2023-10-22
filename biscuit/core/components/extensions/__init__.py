import importlib
import os
import threading
import time
from queue import Queue


class ExtensionManager:
    def __init__(self, base) -> None:
        self.base = base

        self.interval = 5
        # stores loaded instances
        self.extensions = {}
        
        # TODO sandboxed execution of extensions
        # self.blocked_modules = ['os', 'sys']
        # self.imports = {module: __import__(module) for module in sys.modules}
        # sys.modules['builtins'].__import__ = self.restricted_import

        if not (self.base.extensionsdir and os.path.isdir(self.base.extensionsdir)):
            return
        
        self.queue = Queue()
        for extension_file in os.listdir(self.base.extensionsdir):
            if extension_file.endswith(".py"):
                extension_name = os.path.splitext(extension_file)[0]
                if extension_name in self.extensions:
                    return
                self.queue.put(extension_name)

        self.start_server()

    # def restricted_import(self, name, globals={}, locals={}, fromlist=[], level=0):
    #     if name in self.blocked_modules:
    #         raise ImportError("Module '{}' is not allowed.".format(name))

    #     return self.imports[name]

    def _load_extensions(self):
        refresh_count = 0
        while self.alive:
            if self.queue.empty():
                time.sleep(self.interval)

                refresh_count += 1
                if refresh_count == 10:
                    self.base.logger.info(f"Extensions server: active, {len(self.extensions)} extensions loaded.")
                    refresh_count = 0
                continue

            ext = self.queue.get()
            module_name = f"extensions.{ext}"
            try:
                extension_module = importlib.import_module(module_name)
                extension_instance = extension_module.Extension(self.base.api)
                self.extensions[ext] = extension_instance
                
                try:
                    extension_instance.run()
                except:
                    # normally because no `run` method defined.
                    pass

                self.base.logger.info(f"Extension '{ext}' loaded.")
            except ImportError as e:
                self.base.logger.error(f"Failed to load extension '{ext}': {e}")
                self.base.notifications.error(f"Extension '{ext}' failed: see logs.")

    def load_extension(self, file):
        if file.endswith(".py"):
            extension_name = os.path.splitext(file)[0]

            # if an extension with same name is already loaded, skip
            if extension_name in self.extensions:
                return
            self.queue.put(extension_name)
        
    def start_server(self):
        self.server = threading.Thread(target=self._load_extensions, daemon=True)
        self.alive = True
        self.server.start()
        
        self.base.logger.info(f"Extensions server started.")
    
    def restart_server(self):
        self.alive = False
        self.base.after(1000, self.start_server)

    def stop_server(self):
        print(f"Extensions server stopped.")
        self.alive = False
