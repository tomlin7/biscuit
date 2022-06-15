import re
import tkinter as tk


class CustomText(tk.Text):
    """
    Wrapper for the tkinter.Text widget with additional methods for highlighting.

    highlight_all(pattern, tag) - Highlights all matches of the pattern.
    highlight_pattern(pattern, tag) - Cleans all highlights and highlights all matches of the pattern.
    clean_highlights(tag) - Removes all highlights of the given tag.
    search_re(pattern) - Uses the python re library to match patterns.

    """
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        
        # sample tag
        self.tag_config("match", foreground="red")

    def highlight(self, tag, start, end):
        """Wrapper for the tag_add function"""
        self.tag_add(tag, start, end)
    
    def highlight_all(self, pattern, tag):
        """Highlights all matches of the pattern."""
        for match in self.search_re(pattern):
            self.highlight(tag, match[0], match[1])

    def clean_highlights(self, tag):
        """Removes all highlights of the given tag."""
        self.tag_remove(tag, "1.0", tk.END)

    def search_re(self, pattern):
        """
        Uses the python re library to match patterns.

        Arguments:
            pattern - The pattern to match.
        Return value:
            A list of tuples containing the start and end indices of the matches.
            e.g. [("0.4", "5.9"]
        """
        matches = []
        text = self.get("1.0", tk.END).splitlines()
        for i, line in enumerate(text):
            for match in re.finditer(pattern, line):
                matches.append((f"{i + 1}.{match.start()}", f"{i + 1}.{match.end()}"))
        
        return matches

    def highlight_pattern(self, pattern, tag="match"):
        """
        Cleans all highlights and highlights all matches of the pattern.

        Arguments:
            pattern - The pattern to match.
            tag - The tag to use for the highlights.
        """
        self.clean_highlights(tag)
        self.highlight_all(pattern, tag)


root = tk.Tk()

# Example usage
def highlight_text(args):
    text.highlight_pattern(r"\bhello\b")
    text.highlight_pattern(r"\bworld\b", "match2")

text = CustomText(root)
text.pack()

text.tag_config("match2", foreground="green")

# This is not the best way, but it works.
# instead, see: https://stackoverflow.com/a/40618152/14507110
text.bind("<KeyRelease>", highlight_text)

root.mainloop()