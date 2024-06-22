class TextIndex:
    """A class that represents tkinter text widget indexes."""

    def __init__(self, index):
        self.line, self.column = map(int, index.split("."))

    def __lt__(self, other):
        if self.line == other.line:
            return self.column < other.column
        return self.line < other.line

    def __le__(self, other):
        return self == other or self < other

    def __eq__(self, other):
        return self.line == other.line and self.column == other.column

    def __ne__(self, other):
        return not self == other

    def __gt__(self, other):
        return not self <= other

    def __ge__(self, other):
        return not self < other

    def __str__(self):
        return f"{self.line}.{self.column}"

    def __repr__(self):
        return self.__str__()

    def __hash__(self):
        return hash((self.line, self.column))
