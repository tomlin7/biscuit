"""
TODO
[LT] Language Tools for assistance in coding

- Detection of programming language used through extensions
- Execution of scripts
- Semantic syntax highlighting (extra)
- Smart Code completions (extra)

"""

class LSP:
    def __init__(self, master, *args, **kwargs):
        self.master = master

    def get_language(self, filename):
        """
        Get the language of a file
        """
        ...
        
    def get_language_name(self, language):
        """
        Get the name of a language
        """
        ...
    
    def get_language_extensions(self, language):
        """
        Get the extensions of a language
        """
        ...
