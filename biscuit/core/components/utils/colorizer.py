import tkinter as tk


def search(text_widget, keyword, tag):
    pos = 1.0
    while True:
        idx = text_widget.search(keyword, pos, tk.END)
        if not idx:
            break
        pos = '{}+{}c'.format(idx, len(keyword))
        text_widget.tag_add(tag, idx, pos)
