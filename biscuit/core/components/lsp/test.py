"""
TODO
[LT] Language Tools for assistance in coding

- Detection of programming language used through extensions
- Execution of scripts
- Semantic syntax highlighting (extra)
- Smart Code completions (extra)

"""

class LSP:
    def __init__(self, master, *args, **kwargs) -> None:
        self.master = master

    def get_language(self, filename) -> None:
        """Get the language of a file"""
        ...
        
    def get_language_name(self, language) -> None:
        """Get the name of a language"""
        ...
    
    def get_language_extensions(self, language) -> None:
        """Get the extensions of a language"""
        ...
