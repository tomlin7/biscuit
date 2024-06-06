"""Various widgets/functions used across the editor"""

from .bubble import Bubble
from .buttons import *
from .buttonsentry import ButtonsEntry
from .closables import Closable
from .hintedentry import Entry
from .icons import *
from .labels import *
from .linklabel import *
from .native import *
from .scrollableframe import ScrollableFrame
from .scrollbar import Scrollbar
from .shortcut import Shortcut
from .tree import Tree


@staticmethod
def clamp(value, min_val, max_val):
    return min(max(min_val, value), max_val)
