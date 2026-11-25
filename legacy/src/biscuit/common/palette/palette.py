from __future__ import annotations

import platform
import tkinter as tk
import typing

from ..actionset import ActionSet
from ..ui import Frame, Toplevel, Scrollbar
from ..ui.native import Canvas
from .item import PaletteItem
from .searchbar import SearchBar

if typing.TYPE_CHECKING:
    from biscuit import App


# TODO: enlarge current item, add shortcuts, secondary text
class Palette(Toplevel):
    """Palette

    Palette is an action menu centered horizontally and aligned to top of root.
    It is used to display a list of actions that can be performed by the user.
    The user can search for actions and select them using the keyboard or mouse.

    Actions are registered as ActionSets, which are accessed with prefixes from search bar.
    Palette supports setting pinned actions that are displayed at the top of the palette.

    When no prefix is detected, palette turns file search mode on.
    Help is displayed when the user types '?' in the search bar.

    Palette can also be used to take input from the user, e.g: GitHub clone URL, go-to line number.
    """

    def __init__(self, master: App, width=80, *args, **kwargs) -> None:
        """Initializes the Palette

        Args:
            master (App): The main application instance
            width (int, optional): The width of the palette. Defaults to 80."""

        super().__init__(master, *args, **kwargs)
        theme = self.base.theme
        self.config(pady=1, padx=1, **theme.palette)


        self.width = round(width * self.base.scale)
        self.active = False
        self.withdraw()

        if platform.system() == "Windows":
            from ctypes import windll, c_int, byref, sizeof
            
            # DPI awareness (inherited from parent, but ensuring it's acknowledged)
            GWL_STYLE = -16
            WS_CAPTION = 0x00C00000
            WS_THICKFRAME = 0x00040000
            
            self.update_idletasks()
            hwnd = windll.user32.GetParent(self.winfo_id())
            
            style = windll.user32.GetWindowLongPtrW(hwnd, GWL_STYLE)
            style &= ~WS_CAPTION
            # style |= WS_THICKFRAME # THICKFRAME provides the native shadow on Windows
            windll.user32.SetWindowLongPtrW(hwnd, GWL_STYLE, style)
            
            try:
                DWMWA_USE_IMMERSIVE_DARK_MODE = 20
                dark_mode = c_int(1)
                windll.dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, byref(dark_mode), sizeof(dark_mode))
            except:
                pass
                
            windll.user32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0027) # SWP_FRAMECHANGED
        else:
            self.overrideredirect(True)

        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.row = 1
        self.selected = 0

        self.shown_items = []
        self.actionsets = []
        self.active_set = None
        self.active_items = None

        self.searchbar = SearchBar(self)
        self.searchbar.grid(row=0, sticky=tk.EW, padx=5, pady=(5, 2))

        # Items area
        self.items_container = Frame(self, **theme.palette)
        self.items_container.grid(row=1, sticky=tk.NSEW, padx=2, pady=2)
        self.items_container.grid_columnconfigure(0, weight=1)
        self.items_container.grid_rowconfigure(0, weight=1)

        self.canvas = Canvas(self.items_container, **theme.palette, highlightthickness=0)
        self.canvas.grid(row=0, column=0, sticky=tk.NSEW)

        self.scrollbar = Scrollbar(self.items_container, orient=tk.VERTICAL, command=self.canvas.yview, style="EditorScrollbar")
        self.scrollbar.grid(row=0, column=1, sticky=tk.NS)
        self.canvas.configure(yscrollcommand=self.scrollbar.set)

        self.items_frame = Frame(self.canvas, **theme.palette)
        self.items_window = self.canvas.create_window((0, 0), window=self.items_frame, anchor=tk.NW)

        self.items_frame.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.bind("<Configure>", lambda e: self.canvas.itemconfig(self.items_window, width=e.width))

        self.configure_bindings()

    def register_actionset(self, actionset_ref: ActionSet) -> None:
        """Registers an actionset to the palette
        NOTE: actionset_ref is a lambda returning the actionset instead of the actionset itself

        Args:
            actionset_ref (ActionSet): lambda returning the actionset instead of the actionset itself
        """
        self.actionsets.append(actionset_ref)

    def generate_help_actionset(self) -> None:
        """Generates the help actionset

        The help actionset is generated from the registered actionsets.
        It is displayed when the user types '?' in the search bar.
        Make sure this is called after all actionsets have been registered."""

        self.help_actionset = ActionSet("Help", "?")
        for i in self.actionsets:
            i = i()  # get the actionset
            if i.prefix:
                self.help_actionset.append(
                    (
                        i.prefix,
                        lambda _, i=i: self.after(50, self.show, i.prefix),
                        i.description,
                    )
                )

        # print([i() for i in self.actionsets])
        self.register_actionset(lambda: self.help_actionset)

    def add_item(self, text: str, command, *args, **kwargs) -> PaletteItem:
        """Adds an item to the palette"""
        new_item = PaletteItem(self.items_frame, self, text, command, *args, **kwargs)
        new_item.pack(fill=tk.X)
        self.shown_items.append(new_item)
        return new_item

    def configure_bindings(self) -> None:
        self.bind("<FocusOut>", self.hide)
        self.bind("<Escape>", self.hide)

        # self.row += 1 # REMOVED: was causing empty row gap
        self.refresh_selected()

    def on_mousewheel(self, event) -> str:
        if not self.active_items:
            return "break"
        
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
        return "break"

    def pick_actionset(self, actionset: ActionSet) -> None:
        """Picks an actionset to display in the palette

        Args:
            actionset (ActionSet): The actionset to display in the palette"""

        self.active_set = actionset

    def pick_file_search(self, term: str) -> None:
        """Picks the file search actionset

        Args:
            term (str): The search term"""

        self.active_set = self.base.explorer.get_actionset(term)

    def choose(self, *_) -> None:
        """Executes the selected item's command

        If an item is selected, the command is executed with the search term as an argument.
        """

        if item := self.shown_items[self.selected]:
            picked_command = item.command
            term = self.searchbar.term

            self.hide()
            picked_command(term)

    def get_items(self) -> ActionSet:
        return self.active_set

    def hide(self, *args) -> None:
        """Hides the palette"""

        self.withdraw()
        self.reset()

        self.unbind_all("<MouseWheel>")

    def hide_all_items(self) -> None:
        """Hides all items in the palette"""
        for i in self.shown_items:
            i.destroy()
        self.shown_items = []
        self.canvas.yview_moveto(0)

    def reset_selection(self) -> None:
        """Resets the selected item to the first item in the palette"""

        self.selected = 0
        self.refresh_selected()

    def refresh_selected(self) -> None:
        """Refreshes the selected item"""

        if not self.shown_items:
            return
 
        for i in self.shown_items:
            i.deselect()
 
        try:
            item = self.shown_items[self.selected]
            item.select()
            
            # Ensure visible
            self.after(10, self.ensure_visible, item)
        except IndexError as e:
            self.base.logger.error(f"Item '{self.selected}' doesnt exist: {e}")
            
    def ensure_visible(self, item):
        """Scroll canvas to ensure item is visible."""
        if not item.winfo_exists():
            return

        try:
            self.update_idletasks()
            item_y = item.winfo_y()
            item_h = item.winfo_height()
            
            cw_h = self.canvas.winfo_height()
            cv_y = self.canvas.yview()[0] * self.items_frame.winfo_height()
            
            total_h = self.items_frame.winfo_reqheight()
            if total_h == 0:
                return

            if item_y < cv_y:
                self.canvas.yview_moveto(item_y / total_h)
            elif item_y + item_h > cv_y + cw_h:
                self.canvas.yview_moveto((item_y + item_h - cw_h) / total_h)
        except tk.TclError:
            pass

    def reset(self) -> None:
        """Resets the palette

        Clears the search bar and resets the selection."""

        self.searchbar.clear()
        self.reset_selection()

    def search_bar_enter(self, *_) -> str:
        """Handles the enter key press in the search bar"""

        self.choose()
        return "break"

    def show_no_results(self) -> None:
        """Shows a 'No results found' message in the palette"""

        self.hide_all_items()
        self.reset_selection()
        self.add_item("No results found", lambda _: ...)

    def select(self, delta: int) -> None:
        """Selects an item in the palette"""
        if not self.shown_items:
            return "break"
        
        self.selected += delta
        self.selected = min(max(0, self.selected), len(self.shown_items) - 1)
        self.refresh_selected()

    def show_items(self, items: list[PaletteItem]) -> None:
        """Shows a list of items in the palette"""
        self.hide_all_items()
        self.active_items = items
 
        for i in self.active_items:
            item = self.add_item(*i)
            item.mark_term(self.searchbar.term)

        # self.reset_selection()

    def show(self, prefix: str = None, default: str = None) -> None:
        """Shows the palette

        Args:
            prefix (str, optional): The prefix to search for. Defaults to None.
            default (str, optional): The default search term. Defaults to None."""

        self.update_idletasks()
        self.update()
        width = 600
        height = 400
        
        # Center relative to the main window
        x = self.master.winfo_rootx() + int((self.master.winfo_width() - width) / 2)
        y = self.master.winfo_rooty() + 100 # Closer to top
        
        self.minsize(width, 0)
        self.geometry(f"{width}x{height}+{x}+{y}")
        self.deiconify()

        self.focus_set()
        self.searchbar.focus()
        self.searchbar.add_prefix(prefix)

        if default:
            self.searchbar.set_search_term(default)

        self.bind_all("<MouseWheel>", self.on_mousewheel)
