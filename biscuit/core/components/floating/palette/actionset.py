class ActionSet(list):
    def __init__(self, id, prompt, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.id = id
        self.prompt = prompt
    
    def update(self, items):
        self.clear()
        self += items
