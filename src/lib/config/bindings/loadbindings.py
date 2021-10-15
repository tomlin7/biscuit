import json, os


class BindingsLoader:
    def __init__(self, master):
        self.base = master.base

        self.bindings_data = self.load_bindings()

    def load_bindings(self):
        with open(os.path.join(self.base.appdir, 'config/bindings', 'bindings.json'), 'r') as bindings_file:
            bindings_data = json.load(bindings_file)
        return bindings_data
    
    def get_loaded_bindings(self):
        return self.bindings_data
