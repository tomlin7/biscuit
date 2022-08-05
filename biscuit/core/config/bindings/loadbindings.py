import json, os


class BindingsLoader:
    """
    Loads bindings for biscuit from json file.
    """
    def __init__(self, master):
        self.base = master.base

        self.bindings_data = self.load_bindings()

    def load_bindings(self):
        with open(os.path.join(self.base.configdir, 'bindings.json'), 'r') as bindings_file:
            bindings_data = json.load(bindings_file)
        return bindings_data
    
    def get_loaded_bindings(self):
        return self.bindings_data
