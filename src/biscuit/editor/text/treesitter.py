import tree_sitter
from tree_sitter import Language, Parser

class TreeSitterHighlighter:
    def __init__(self, language: str):
        self.language = language
        self.parser = Parser()
        self.language_library = self.load_language_library(language)
        self.parser.set_language(self.language_library)

    def load_language_library(self, language: str):
        # Load the language library for the given language
        if language == "python":
            return Language('build/my-languages.so', 'python')
        else:
            raise ValueError(f"Unsupported language: {language}")

    def highlight(self, code: str):
        tree = self.parser.parse(bytes(code, "utf8"))
        root_node = tree.root_node
        return self.extract_highlight_info(root_node)

    def extract_highlight_info(self, node):
        # Extract highlight information from the syntax tree
        highlight_info = []
        for child in node.children:
            highlight_info.append({
                "type": child.type,
                "start_byte": child.start_byte,
                "end_byte": child.end_byte,
                "start_point": child.start_point,
                "end_point": child.end_point
            })
            highlight_info.extend(self.extract_highlight_info(child))
        return highlight_info
