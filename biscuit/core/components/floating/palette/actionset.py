from typing import Callable, List, Tuple


class ActionSet(list):
    def __init__(self, description: str, prompt: str, items: List[Tuple[str, Callable]] = [], 
                    pinned: List[Tuple[str, Callable]] = [], *args, **kwargs) -> None:
        """Palette Actionset
        A list of items that can be searched through.
        
        Attributes
        ----------
        description : str
            The description of the actionset.
        prompt : str
            The prompt of the actionset.
        items : List[Tuple[str, Callable]]
            The items in the actionset.
        pinned : List[Tuple[str, Callable]]
            The pinned items in the actionset.
        """
        
        super().__init__(items, *args, **kwargs)
        self.description: str = description
        self.prompt: str = prompt

        self.pinned: List[Tuple[str, Callable]] = pinned # [[command, callback], ...]
    
    def update(self, items) -> None:
        "Clear and update the items in the actionset."
        self.clear()
        self += items
    
    def get_pinned(self, term) -> list:
        "Returns the pinned items with the term formatted."
        if not self.pinned:
            return []
        
        return [[item[0].format(term)] + item[1:] for item in self.pinned]
