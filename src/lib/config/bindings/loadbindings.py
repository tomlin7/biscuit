import json


class BindingsLoader:
    def __init__(self):
        self.bindings_data = self.load_bindings()

    def load_bindings(self):
        with open(f'src/config/bindings/bindings.json', 'r') as bindings_file:
            bindings_data = json.load(bindings_file)
        return bindings_data
    
    def get_loaded_bindings(self):
        return self.bindings_data
