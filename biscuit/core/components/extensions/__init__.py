import importlib
import os, threading


class ExtensionManager:
    def __init__(self, base):
        self.base = base
        self.extensions = []
        self.load_extensions()

    def load_extensions(self):
        "currently loads all extension in the directory"
        extension_files = os.listdir(self.base.extensionsdir)
        for extension_file in extension_files:
            if extension_file.endswith(".py"):
                extension_name = os.path.splitext(extension_file)[0]
                module_name = f"extensions.{extension_name}"
                try:
                    extension_module = importlib.import_module(module_name)
                    extension_instance = extension_module.Extension(self.base.api)
                    self.extensions.append(extension_instance)
                    self.base.logger.info(f"Extension '{extension_name}' loaded.")
                except ImportError:
                    self.base.logger.error(f"Failed to load extension '{extension_name}'.")

    def run_extensions(self):
        for extension in self.extensions:
            try:
                extension.run()
            except Exception as e:
                self.base.logger.error(e)
                self.base.notifications.error(f"Extension {extension} failed: see logs.")
    
    def start_server(self):
        self.base.logger.info(f"Extensions server started.")
        self.server = threading.Thread(target=self.run_extensions)
        self.server.start()
    
    def stop_server(self):
        print(f"Extensions server stopped.")
        self.server.join()
