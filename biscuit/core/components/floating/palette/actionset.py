class ActionSet(list):
    def __init__(self, description, prompt, items=[], permitems=[], *args, **kwargs):
        super().__init__(items, *args, **kwargs)
        self.description = description
        self.prompt = prompt

        self.permitems = permitems # [[command, callback], ...]
    
    def update(self, items):
        self.clear()
        self += items
    
    def get_permitems(self, term):
        if not self.permitems:
            return []
        
        return [[item[0].format(term)] + item[1:] for item in self.permitems]
