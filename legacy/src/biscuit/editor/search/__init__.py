import tkinter as tk
from hintedtext import HintedEntry

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, Label, ButtonsEntry, IconButton
from biscuit.editor.search.results import SearchResults

from ..editorbase import BaseEditor


class SearchEditor(BaseEditor):
    name = "Search"

    def __init__(self, master, exists=False, editable=False, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(padx=0, pady=0, **self.base.theme.editors)

        self.filename = "Search"
        self.__icon__ = Icons.SEARCH

        self.container = Frame(self, **self.base.theme.editors)
        self.container.pack(fill=tk.BOTH, expand=True)

        # Header area
        self.header_container = Frame(self.container, **self.base.theme.editors)
        self.header_container.pack(fill=tk.X, anchor=tk.N, pady=(10, 0), padx=5)

        # Main Search Row
        self.search_row = Frame(self.header_container, **self.base.theme.editors)
        self.search_row.pack(fill=tk.X)

        # Results area
        self.results = SearchResults(self.container, self, **self.base.theme.editors)
        
        # Collapse button
        self.collapse_btn = IconButton(self.search_row, Icons.FOLD, self.results_toggle_collapse, icon2=Icons.UNFOLD)
        self.collapse_btn.pack(side=tk.LEFT, anchor=tk.N, pady=2)

        # Search Box
        self.searchbox = ButtonsEntry(
            self.search_row,
            hint="Search all files...",
            buttons=(
                (Icons.CASE_SENSITIVE, self.results.search_casesensitive),
                (Icons.WHOLE_WORD, self.results.search_wholeword),
                (Icons.REGEX, self.results.search_regex),
            ),
        )
        self.searchbox.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2)
        # Force the internal entry to trigger search on Return
        self.searchbox.entry.bind("<Return>", self.results.search)

        # Extra Buttons
        self.extra_buttons = Frame(self.search_row, **self.base.theme.editors)
        self.extra_buttons.pack(side=tk.LEFT, padx=(5, 0))

        IconButton(self.extra_buttons, Icons.FILTER, self.toggle_filter).pack(side=tk.LEFT)
        IconButton(self.extra_buttons, Icons.REPLACE, self.toggle_replace).pack(side=tk.LEFT) 
        
        self.extra_buttons_2 = Frame(self.search_row, **self.base.theme.editors)
        self.extra_buttons_2.pack(side=tk.LEFT, padx=(5, 0))

        IconButton(self.extra_buttons_2, Icons.REFRESH, self.results.search).pack(side=tk.LEFT)
        IconButton(self.extra_buttons_2, Icons.CHEVRON_LEFT, lambda: None).pack(side=tk.LEFT)
        IconButton(self.extra_buttons_2, Icons.CHEVRON_RIGHT, lambda: None).pack(side=tk.LEFT)
        
        self.count_label = Label(self.extra_buttons_2, text="0/0", font=("Segoe UI", 9), fg=self.base.theme.border, **self.base.theme.editors.labels)
        self.count_label.pack(side=tk.LEFT, padx=5)

        # Replace Row
        self.replace_row = Frame(self.header_container, **self.base.theme.editors)
        self.replace_row.pack(fill=tk.X, padx=(30, 0)) 
        self.replace_row.pack_forget() # Initially hidden

        # Normal Entry for Replace
        self.replace_entry_container = Frame(self.replace_row, **self.base.theme.utils.frame)
        self.replace_entry_container.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=2)
        self.replace_entry_container.config(padx=1, pady=1)

        self.replacebox = HintedEntry(
            self.replace_entry_container,
            hint="Replace in project...",
            relief=tk.FLAT,
            font=self.base.settings.uifont,
            bd=5,
            **self.base.theme.utils.entry
        )
        self.replacebox.pack(fill=tk.X, expand=True)
        self.replacebox.bind("<Return>", self.results.search)

        self.replace_btns = Frame(self.replace_row, **self.base.theme.editors)
        self.replace_btns.pack(side=tk.LEFT, padx=(5, 0), pady=2)
        
        IconButton(self.replace_btns, Icons.REPLACE, self.results.replace_single).pack(side=tk.LEFT)
        IconButton(self.replace_btns, Icons.REPLACE_ALL, self.results.replace_all).pack(side=tk.LEFT)

        # Filter Row
        self.filter_row = Frame(self.header_container, **self.base.theme.editors)
        # self.filter_row.pack(fill=tk.X, padx=(30, 0)) # Initially hidden

        # Include Box
        self.include_container = Frame(self.filter_row, **self.base.theme.utils.frame)
        self.include_container.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=2, padx=(0, 2))
        self.include_container.config(padx=1, pady=1)
        
        Label(self.include_container, text="Include:", font=("Segoe UI", 8), fg=self.base.theme.border, **self.base.theme.editors.labels).pack(side=tk.LEFT, padx=(0, 1), fill=tk.BOTH)
        self.includes = HintedEntry(
            self.include_container,
            hint="e.g. src/**/*.py",
            relief=tk.FLAT,
            font=self.base.settings.uifont,
            bd=5,
            **self.base.theme.utils.buttonsentry
        )
        self.includes.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.includes.bind("<Return>", self.results.search)

        # Exclude Box
        self.exclude_container = Frame(self.filter_row, **self.base.theme.utils.frame)
        self.exclude_container.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=2, padx=(2, 0))
        self.exclude_container.config(padx=1, pady=1)
        
        Label(self.exclude_container, text="Exclude:", font=("Segoe UI", 8), fg=self.base.theme.border, **self.base.theme.editors.labels).pack(side=tk.LEFT, padx=(0, 1), fill=tk.BOTH)
        self.excludes = HintedEntry(
            self.exclude_container,
            hint="e.g. node_modules/*",
            relief=tk.FLAT,
            font=self.base.settings.uifont,
            bd=5,
            **self.base.theme.utils.buttonsentry
        )
        self.excludes.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.excludes.bind("<Return>", self.results.search)

        self.filter_extras = Frame(self.filter_row, **self.base.theme.editors)
        self.filter_extras.pack(side=tk.LEFT, padx=(5, 0))
        self.files_btn = IconButton(self.filter_extras, Icons.FILES, self.toggle_open_editors_only)
        self.files_btn.pack(side=tk.LEFT)

        # Empty State Overlay
        self.empty_state = Frame(self.container, **self.base.theme.editors)
        self.empty_state.place(relx=0.5, rely=0.55, anchor=tk.CENTER)

        Label(self.empty_state, text="Search All Files", font=("Segoe UI", 12, "bold"), fg=self.base.theme.border, **self.base.theme.editors.labels).pack(pady=5)
        Label(self.empty_state, text="Hit enter to search. For more options:", font=("Segoe UI", 10), fg=self.base.theme.border, **self.base.theme.editors.labels).pack(pady=(0, 20))
        
        self.shortcuts_container = Frame(self.empty_state, **self.base.theme.editors)
        self.shortcuts_container.pack()

        self.add_shortcut_label(Icons.FILTER, "Include/exclude specific paths", "Alt+F")
        self.add_shortcut_label(Icons.REPLACE, "Find and replace", "Alt+Shift+H")
        self.add_shortcut_label(Icons.REGEX, "Match with regex", "Alt+R")
        self.add_shortcut_label(Icons.CASE_SENSITIVE, "Match case", "Alt+C")
        self.add_shortcut_label(Icons.WHOLE_WORD, "Match whole words", "Alt+W")

        self.results.pack(fill=tk.BOTH, expand=True, padx=10, pady=(10, 10))
        self.results.pack_forget()

    def add_shortcut_label(self, icon, text, shortcut):
        row = Frame(self.shortcuts_container, **self.base.theme.editors)
        row.pack(fill=tk.X, pady=2)
        
        Label(row, text=icon, font=("codicon", 11), fg=self.base.theme.border, **self.base.theme.editors.labels).pack(side=tk.LEFT, padx=(0, 5))
        Label(row, text=text, anchor=tk.W, font=("Segoe UI", 10), fg=self.base.theme.border, **self.base.theme.editors.labels).pack(side=tk.LEFT)
        Label(row, text=shortcut, anchor=tk.E, font=("Segoe UI", 10), fg=self.base.theme.border, **self.base.theme.editors.labels).pack(side=tk.RIGHT, padx=(20, 0))

    def results_toggle_collapse(self, *_) -> None:
        self.results.toggle_collapse()

    def show_results(self):
        self.empty_state.place_forget()
        self.results.pack(fill=tk.BOTH, expand=True, padx=10, pady=(10, 10))

    def hide_results(self):
        self.results.pack_forget()
        self.empty_state.place(relx=0.5, rely=0.55, anchor=tk.CENTER)

    def toggle_replace(self, *_) -> None:
        if self.replace_row.winfo_ismapped():
            self.replace_row.pack_forget()
        else:
            self.replace_row.pack(fill=tk.X, padx=(30, 0))

    def toggle_filter(self, *_) -> None:
        if self.filter_row.winfo_ismapped():
            self.filter_row.pack_forget()
        else:
            self.filter_row.pack(fill=tk.X, padx=(30, 0))

    def toggle_open_editors_only(self, *_) -> None:
        self.results.toggle_open_editors_only()
        if self.results.open_editors_only:
            self.files_btn.config(**self.base.theme.utils.button)
        else:
            self.files_btn.config(**self.base.theme.utils.iconbutton)

    def focus(self) -> None:
        self.searchbox.entry.focus()
