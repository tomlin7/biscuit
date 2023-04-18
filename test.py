import tkinter as tk
from tkinter import ttk
import pygments
from pygments.lexers import get_all_lexers, get_lexer_by_name
from pygments.formatters import get_formatter_by_name

class TextHighlighter:
    def __init__(self, master):
        self.master = master
        self.master.title("Text Highlighter")
        
        # Create the text widget
        self.text_widget = tk.Text(self.master, height=20, width=80)
        self.text_widget.pack()
        
        # Create the language selection list
        self.language_list = ttk.Combobox(self.master, values=[lexer[0] for lexer in get_all_lexers()], state='readonly')
        self.language_list.current(0)
        self.language_list.pack()
        
        # Create the highlight button
        self.highlight_button = tk.Button(self.master, text="Highlight", command=self.highlight_text)
        self.highlight_button.pack()
        
    def highlight_text(self):
        # Get the selected language from the language selection list
        selected_language = self.language_list.get()
        
        # Get the lexer for the selected language
        lexer = get_lexer_by_name(selected_language)
        
        # Get the formatter for generating the highlighted text
        formatter = get_formatter_by_name('html', style='default')
        
        # Highlight the text using Pygments
        highlighted_text = pygments.highlight(self.text_widget.get('1.0', 'end'), lexer, formatter)
        
        # Apply the highlighting colors to the text in the widget
        for token, value in lexer.get_tokens(highlighted_text):
            tag_name = str(token)
            self.text_widget.tag_add(tag_name, 'end - %dc' % len(value), 'end')
            color = 'red'
            self.text_widget.tag_configure(tag_name, foreground=color)

            
# Create the tkinter application
root = tk.Tk()

# Create the text highlighter instance
text_highlighter = TextHighlighter(root)

# Run the tkinter event loop
root.mainloop()
