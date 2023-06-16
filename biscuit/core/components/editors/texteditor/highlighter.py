import tkinter as tk
from pygments import lex
from pygments.lexers import PythonLexer
from pygments.token import Token

class Highlighter:
    def __init__(self, master, *args, **kwargs):
        self.text = master
        self.base = master.base

        # testing
        self.lexer = PythonLexer()

        self.tag_colors = {
            Token.Keyword: "#0000ff",
            Token.Keyword.Constant:"#0000ff",
            Token.Keyword.Declaration:"#0000ff",
            Token.Keyword.Namespace:"#0000ff",
            Token.Keyword.Pseudo:"#0000ff",
            Token.Keyword.Reserved:"#0000ff",
            Token.Keyword.Type:"#0000ff",

            Token.Name:"#267f99",
            Token.Name.Attribute:"#267f99",
            Token.Name.Builtin:"#267f99",
            Token.Name.Builtin.Pseudo:"#267f99",
            Token.Name.Class:"#267f99",
            Token.Name.Constant:"#267f99",
            Token.Name.Decorator:"#267f99",
            Token.Name.Entity:"#267f99",
            Token.Name.Exception:"#267f99",
            Token.Name.Function:"#795e26",
            Token.Name.Function.Magic:"#795e26",
            Token.Name.Property:"#267f99",
            Token.Name.Label:"#267f99",
            Token.Name.Namespace:"#267f99",
            Token.Name.Other:"#267f99",
            Token.Name.Tag:"#267f99",
            Token.Name.Variable:"#267f99",
            Token.Name.Variable.Class:"#267f99",
            Token.Name.Variable.Global:"#267f99",
            Token.Name.Variable.Instance:"#267f99",
            Token.Name.Variable.Magic:"#267f99",

            Token.String:"#b11515",
            Token.String.Affix:"#b11515",
            Token.String.Backtick:"#b11515",
            Token.String.Char:"#b11515",
            Token.String.Delimiter:"#b11515",
            Token.String.Doc:"#b11515",
            Token.String.Double:"#b11515",
            Token.String.Escape:"#b11515",
            Token.String.Heredoc:"#b11515",
            Token.String.Interpol:"#b11515",
            Token.String.Other:"#b11515",
            Token.String.Regex:"#b11515",
            Token.String.Single:"#b11515",
            Token.String.Symbol:"#b11515",

            Token.Number:"#098658",
            Token.Number.Bin:"#098658",
            Token.Number.Float:"#098658",
            Token.Number.Hex:"#098658",
            Token.Number.Integer:"#098658",
            Token.Number.Integer.Long:"#098658",
            Token.Number.Oct:"#098658",

            # Operator: "#",
            # Operator.Word: "#",

            # Punctuation: "#",
            # Punctuation.Marker: "#",

            Token.Comment:"#098658",
            Token.Comment.Hashbang:"#098658",
            Token.Comment.Multiline:"#098658",
            Token.Comment.Preproc:"#098658",
            Token.Comment.PreprocFile:"#098658",
            Token.Comment.Single:"#098658",
            Token.Comment.Special:"#098658",
        }

        self.setup_highlight_tags()

    def setup_highlight_tags(self):
        for token, color in self.tag_colors.items():
            self.text.tag_configure(str(token), foreground=color)

    def highlight(self):
        for token, _ in self.tag_colors.items():
            self.text.tag_remove(str(token), '1.0', tk.END)
            
        text = self.text.get_all_text()
        self.text.mark_set("range_start", "1.0")
        for token, content in lex(text, self.lexer):
            self.text.mark_set("range_end", f"range_start + {len(content)}c")
            self.text.tag_add(str(token), "range_start", "range_end")
            self.text.mark_set("range_start", "range_end")

        #DEBUG
        #     print(f"{content} is recognized as a <{str(token)}>")
        # print("==================================")
