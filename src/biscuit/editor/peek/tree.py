from src.biscuit.common.ui import Tree


class PeekTree(Tree):
    def __init__(self, *args, **kwargs):
        super().__init__(columns=("path", "start"), *args, **kwargs)
        self.bind("<<TreeviewSelect>>", self.singleclick)
