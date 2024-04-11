"""Various widgets/functions used across the editor"""

from .bubble import Bubble
from .button import Button
from .buttonsentry import ButtonsEntry
from .callername import caller_name
from .canvas import Canvas
from .classdrill import *
from .closelistitem import CloseListItem
from .codicon import get_codicon
from .colorizer import colorize
from .entry import Entry
from .filetype import FileType
from .fixedstack import FixedSizeStack
from .frame import Frame
from .icon import Icon
from .iconbutton import IconButton
from .iconlabel import IconLabel
from .iconlabelbutton import IconLabelButton
from .label import Label, TruncatedLabel, WrappingLabel
from .linklabel import LinkLabel
from .menubutton import Menubutton
from .python_dialog import check_python_installation
from .scrollableframe import ScrollableFrame
from .scrollbar import Scrollbar
from .shortcut import Shortcut
from .sysinfo import SysInfo
from .text import Text
from .textutils import *
from .toplevel import Toplevel
from .tree import Tree


@staticmethod
def clamp(value, min_val, max_val):
    return min(max(min_val, value), max_val)
