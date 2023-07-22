import importlib
import os
import sys
import threading


class ExtensionManager:
    def __init__(self, base):
        self.base = base
        self.extensions = {}
        self.run_finished = {}
        
        # #TODO file watcher for extensions directory

        # self.blocked_modules = ['os', 'sys']
        # self.imports = {module: __import__(module) for module in sys.modules}
        # sys.modules['builtins'].__import__ = self.restricted_import

        self.load_extensions()

    def restricted_import(self, name, globals={}, locals={}, fromlist=[], level=0):
        if name in self.blocked_modules:
            raise importError("Module '{}' is not allowed.".format(name))

        return self.imports[name]

    def load_extensions(self):
        #TODO support loading/running/unloading individual extensions
        extension_files = os.listdir(self.base.extensionsdir)
        for extension_file in extension_files:
            if extension_file.endswith(".py"):
                extension_name = os.path.splitext(extension_file)[0]
                if extension_name in self.extensions.keys():
                    return

                self.load_extension(extension_name)

    def refresh_extensions(self):
        self.load_extensions()

    def load_extension(self, extension_name):
        module_name = f"extensions.{extension_name}"
        try:
            extension_module = importlib.import_module(module_name)
            extension_instance = extension_module.Extension(self.base.api)
            self.extensions[extension_name] = extension_instance

            self.base.logger.info(f"Extension '{extension_name}' loaded.")
        except importError as e:
            self.base.logger.error(f"Failed to load extension '{extension_name}': {e}")
            self.base.notifications.error(f"Extension '{extension_name}' failed: see logs.")
    
    def start_server(self):
        self.base.logger.info(f"Extensions server started.")
        self.server = threading.Thread(target=self.run_extensions)
        self.server.start()
    
    def restart_server(self):
        self.start_server()

    def stop_server(self):
        print(f"Extensions server stopped.")
        self.server.join()

    def run_extensions(self):
        for name, extension in self.extensions.items():
            if name in self.run_finished.keys():
                continue
            
            try:
                extension.run()
                self.run_finished[name] = extension
            except Exception as e:
                self.base.logger.error(e)
                self.base.notifications.error(f"Extension '{extension}' failed: see logs.")
