"""
Various types of widgets/functions used across the editor
"""

from .button import Button
from .bubble import Bubble
from .buttonsentry import ButtonsEntry
from .codicon import get_codicon
from .filetype import FileType
from .iconbutton import IconButton
from .label import WrappingLabel
from .scrollbar import Scrollbar
from .scrollableframe import ScrollableFrame
from .tree import Tree
from .shortcut import Shortcut
from .entrybox import EntryBox


@staticmethod
def clamp(value, min_val, max_val):
    return min(max(min_val, value), max_val)
