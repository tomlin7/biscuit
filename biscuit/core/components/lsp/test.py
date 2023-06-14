"""
TODO
[LT] Language Tools for assistance in coding

- Detection of programming language used through extensions
- Execution of scripts
- Semantic syntax highlighting (extra)
- Smart Code completions (extra)

"""

from ...config import languages


class LanguageTools:
    def __init__(self, master, *args, **kwargs):
        self.master = master

    def get_language(self, filename):
        """
        Get the language of a file
        """
        ext = filename.split('.')[-1]
        if ext in languages:
            return ext
        else:
            return 'plain'
        
    def get_language_name(self, language):
        """
        Get the name of a language
        """
        if language in languages:
            return self.languages[language]['name']
        else:
            return 'Plain Text'
    
    def get_language_extensions(self, language):
        """
        Get the extensions of a language
        """
        if language in languages:
            return self.languages[language]['extensions']
        else:
            return []
