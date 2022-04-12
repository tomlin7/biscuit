import tkinter as tk

from .button import Button
from .results import FindResults
from .findbox import FindBox
from .replacebox import ReplaceBox


class FindReplaceContainer(tk.Frame):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.config(bg="#f3f3f3")
        self.replace_enabled = False

        self.find_entry = FindBox(self, width=20)
        self.replace_entry = ReplaceBox(self, width=20)

        self.find_results = FindResults(self)

        self.replace_btn_holder = tk.Frame(self, bg="#252526", pady=2)
        self.replace_button = Button(self.replace_btn_holder, bg="#252526", hbg="#4b4c4d", img=tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAABAAAAARCAYAAADUryzEAAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2Nhc
        GUub3Jnm+48GgAAAjBJREFUOI2VUj1olEEQfbO7lwODEAjeCSoSIaAcWJgIosct+4mCYGORNoUWIqTRQsTKLqBYp1Dwp/xEJAFDwMC3+yE2Br
        SxEUEsEiWJEDgTyG2+GQsvkjsTo6/bZd6892YG+A947xe7/8zfCCGE0wDOFUXxPkmSSQA9IYQrAKK19ikA0GZxnuf7iqIYNcYsMXNRFMU3pVQ
        PgBUAz2OMx0ql0gKAMQA3ROSac+71bwfMPEVEg8y8CGBNa/2WmfcqpZoiYsrl8h5mjtbaJ977swD2d0c4Yoy5XK/Xp7ZkzkXkE4BYFIUQ0VoI
        YZaIDiulrgOA8d4/IqIZEWnFGAe8969E5JJz7oeIJK1Wq9zf398aHh6O09PTA319fWp9fT02Go0NACDv/QUAzwAsAKiKyAQzP9Ba39xtK0T0k
        gAgy7KLSqlJAPestbeyLDsK4OA/NHhIaZrqarVqY4yHtNbzu5FE5GuSJB/aM/piKpXKYxHRxpjmbuS2aiOEcNVamwO/tnCeiE5Zaz8DQJqmul
        ar6Vqt1morKu+9cs5ttFVTZj4OIAcAtbV7CGGwUqm8WF5efhNCGM2yrB5CeKeUmk3TVG/nqOOUe3t755vNZg7AATgDoEFE9zfPdjt0OFhdXR0
        hohMAAgAopZYAnPTej8zNzZW24ceOBsw8KSIfieg7M0+Vy+VxEVkQkQNDQ0Mb3WwRGeuI4JxbAXCnq258J/vOuRlDRHdFxHvv/1DYARHA7c3H
        T51aBFm+qi3JAAAAAElFTkSuQmCC"""))

        self.find_btns_holder = tk.Frame(self, bg="#252526", pady=6)
        self.selection_button = Button(self.find_btns_holder, bg="#252526", hbg="#4b4c4d", img=tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAABEAAAALCAYAAACZIGYHAAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2Nhc
        GUub3Jnm+48GgAAAGdJREFUKJFjPHnx5n8GEsF/RgZvCz31bTA+yz8GJmNSDWH8xnCHVD30AYynLt+RpdQQlv///j6i2BAGhv9KlBoyeADjkX
        M3pIhRyPGP8ZeJifobbHIsrMyMT4kx5A8zwykGBgZzbHIAsMwZm/JJgOgAAAAASUVORK5CYII="""))
        self.close_button = Button(self.find_btns_holder, bg="#252526", hbg="#4b4c4d", img=tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2Nhc
        GUub3Jnm+48GgAAALhJREFUGJV1kL0OAVEQhb9ze61HkK2sxk8k3sqqUNhEgafS2Evjqna9hFKiMAok3OxOOfOdM3NGPlwz8WwP0iSjoYpzmT
        t4OBMtQ9NjKLdNoKS5ida7cbmufKgsFhTnMvehMh/Kzb9DJKgDFQtktjB7FpIbgW2HaTKrhQF8qPbABLPTsJcMfmcuvhGYgB2Q+nEG9wtKmn9
        Wj03Ka7/UlDoOrchxRlTf0MJ2TtIdWNeBAKNuZwmsDd1eZYKFNbEaSb4AAAAASUVORK5CYII="""))

        self.grid_columnconfigure(0, weight=1)
        
        self.find_entry.grid(row=0, column=0, sticky=tk.NSEW, pady=5)

        self.find_results.grid(row=0, column=1, sticky=tk.NSEW, pady=5)
        self.replace_button.grid(row=0, column=0, sticky=tk.NS, padx=5)

        self.find_btns_holder.grid(row=0, column=2, sticky=tk.NSEW, padx=(10, 5))

        self.selection_button.grid(row=0, column=0, sticky=tk.NSEW, pady=3)
        self.close_button.grid(row=0, column=1, sticky=tk.NSEW, pady=3)
    
    def get_term(self):
        return self.find_entry.get()

    def toggle_replace(self, state):
        if self.replace_enabled:
            self.replace_enabled = False
            self.replace_entry.grid_remove()
            self.replace_btn_holder.grid_remove()
        else:
            self.replace_enabled = True
            self.replace_entry.grid(row=1, column=0, sticky=tk.NSEW, pady=(0, 5))
            self.replace_btn_holder.grid(row=1, column=1, sticky=tk.NSEW, pady=(0, 5))
