from biscuit.core.components.utils import Tree


class DefinitionsTree(Tree):
    def __init__(self, *args, **kwargs):
        super().__init__(columns=("path", "start"), *args, **kwargs)
        self.bind("<<TreeviewSelect>>", self.singleclick)
