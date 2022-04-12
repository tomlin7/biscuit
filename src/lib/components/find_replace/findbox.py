import tkinter as tk

from .button import Button
from .entrybox import EntryBox


class FindBox(EntryBox):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)

        self.btn_frame.grid(row=0, column=1, sticky=tk.NSEW)
        
        self.full_word = Button(self.btn_frame, bg="#3c3c3c", hbg="#4b4c4d", img=tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAABMAAAANCAYAAABLjFUnAAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHR
        Tb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAahJREFUKJGdkrFrU1EYxX/fS4JGdKkOLo5NI9jYak
        wqpA7OxaHi5uDSQXASOgniHyAdXERBKNV/wKEuLiKIvc8MuemS9wSpUARByJBBjH33uLQhtiQGf+s999xzv
        vvBhDifrDufPBqniSY1m4T8odcXDV2QrEjEl1y/t1mtVn8Paz61Ps9nll0zs6+12dJrM9OoZE8EDTM7h3iY
        FU6+lWRD53eCacOghngWb6ePhy8bI2g2v53ICr1uCGHm6vz5HeeTdWCvVimtmJncdqdKsA99+3V2sVLpHq3
        ZSpdkum3icma9KaBAlJ8CdvYluwe16rPlpvPJz+Ph2DQQ/1XT+c51TK8Qm8oVGvWLM6eB7qjk+8WCxGBmg2
        TC6obeL8yVXwJIiuJ2OvK3m+2knEnFflGdo2YhfLQoeuB8uoppL24nt8BOHfK44XyyC5CJ+8Bao1zuDcy2f
        PI8p+jplbnpd86nK0a4KfgRyN0zhSURvgOY9AazWNgl4AxorVYpvYCDdQl3cT5R3EqXx89mPHErXXY+UR5A
        xsKWT0euyb8Q1AHyBhJa/W+nIf4AQku6KGfDUgAAAAAASUVORK5CYII="""))
        self.regex_button = Button(self.btn_frame, bg="#3c3c3c", hbg="#4b4c4d", img=tk.PhotoImage(data="""
        iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAACXBIWXMAAABfAAAAXwEqnu0dAAAAGXRFWHRTb2Z0
        d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAPJJREFUKJGtkL1KwwAUhb+bFK0SCp18g4o4VBGsi4+ig7joC/ga
        Qp9AN/sSDg4m6WB+DDYNiJu4KS5qaY6DiJXETp7tXr5zDhyYo2FUbAZx/jz7a9SBfjQ6WLL3iw/N/NL7FTTZciqw
        X7TM7OiN5q1K7QKEcX5s5WSE2Le6BklOkBaHVnKKoybwhDjpdVfPKw0AUfTQQuW6mVxAQstC7cFAbqXhKknaC1q8
        AzLX3P6U6Vkp7TnQB0tq1/HjYgcgvBlvBEn+AnCZZd4wyrdrDd+6TsdrYZz/SrUgzl9nzsdet9OZF9IAvB9e3t/o
        l2pX+lfDJ85DYGsTUOfAAAAAAElFTkSuQmCC"""))
        
        self.full_word.grid(row=0, column=0, sticky=tk.NSEW, pady=2, padx=(3, 1))
        self.regex_button.grid(row=0, column=2, sticky=tk.NSEW, pady=2, padx=(1, 3))
