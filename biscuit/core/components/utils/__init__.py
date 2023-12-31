"""Various types of widgets/functions used across the editor"""

from .bubble import Bubble
from .button import Button
from .buttonsentry import ButtonsEntry
from .callername import caller_name
from .canvas import Canvas
from .codicon import get_codicon
from .colorizer import colorize
from .entry import Entry
from .filetype import FileType
from .frame import Frame
from .icon import Icon
from .iconbutton import IconButton
from .iconlabelbutton import IconLabelButton
from .label import Label, TruncatedLabel, WrappingLabel
from .menubutton import Menubutton
from .scrollableframe import ScrollableFrame
from .scrollbar import Scrollbar
from .shortcut import Shortcut
from .text import Text
from .textutils import *
from .toplevel import Toplevel
from .tree import Tree


@staticmethod
def clamp(value, min_val, max_val):
    return min(max(min_val, value), max_val)
