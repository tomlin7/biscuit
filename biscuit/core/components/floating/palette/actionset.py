class ActionSet(list):
    def __init__(self, description, prompt, items=[], pinned=[], *args, **kwargs):
        super().__init__(items, *args, **kwargs)
        self.description = description
        self.prompt = prompt

        self.pinned = pinned # [[command, callback], ...]
    
    def update(self, items):
        self.clear()
        self += items
    
    def get_pinned(self, term):
        if not self.pinned:
            return []
        
        return [[item[0].format(term)] + item[1:] for item in self.pinned]
