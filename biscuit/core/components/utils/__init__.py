"""
Various types of widgets/functions used across the editor
"""

from .button import Button
from .bubble import Bubble
from .buttonsentry import ButtonsEntry
from .canvas import Canvas
from .codicon import get_codicon
from .colorizer import colorize
from .frame import Frame
from .filetype import FileType
from .icon import Icon
from .iconbutton import IconButton
from .label import WrappingLabel, Label, TruncatedLabel
from .scrollbar import Scrollbar
from .scrollableframe import ScrollableFrame
from .tree import Tree
from .shortcut import Shortcut
from .entry import Entry
from .toplevel import Toplevel
from .menubutton import Menubutton
from .text import Text
from .iconlabelbutton import IconLabelButton

@staticmethod
def clamp(value, min_val, max_val):
    return min(max(min_val, value), max_val)
