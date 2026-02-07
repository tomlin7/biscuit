from __future__ import annotations

import os
import tkinter as tk
import typing
from pathlib import Path

if typing.TYPE_CHECKING:
    from biscuit import App

    from .text import Text

try:
    from tree_sitter import Parser, Query, QueryCursor
    from tree_sitter_language_pack import get_language, get_parser

    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False

# File extension -> tree-sitter-language-pack language key
EXTENSION_MAP = {
    ".py": "python",
    ".pyw": "python",
    ".pyi": "python",
    ".js": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".hh": "cpp",
    ".java": "java",
    ".rs": "rust",
    ".go": "go",
    ".rb": "ruby",
    ".erb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".cs": "csharp",
    ".lua": "lua",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "scss",
    ".json": "json",
    ".toml": "toml",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".markdown": "markdown",
    ".sql": "sql",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".r": "r",
    ".R": "r",
    ".scala": "scala",
    ".zig": "zig",
    ".dart": "dart",
    ".ex": "elixir",
    ".exs": "elixir",
    ".erl": "erlang",
    ".hrl": "erlang",
    ".hs": "haskell",
    ".ml": "ocaml",
    ".mli": "ocaml",
    ".pl": "perl",
    ".pm": "perl",
    ".vim": "vim",
    ".el": "elisp",
    ".clj": "clojure",
    ".cmake": "cmake",
    ".dockerfile": "dockerfile",
    ".make": "make",
    ".mk": "make",
    ".Makefile": "make",
    ".proto": "proto",
    ".xml": "xml",
    ".svelte": "svelte",
    ".vue": "vue",
    ".tf": "hcl",
    ".hcl": "hcl",
    ".nix": "nix",
    ".gleam": "gleam",
    ".v": "v",
    ".asm": "asm",
    ".s": "asm",
    ".S": "asm",
    ".ini": "ini",
    ".cfg": "ini",
    ".reg": "ini",
}

# Language alias -> tree-sitter-language-pack key
# Maps common names / Pygments aliases to tree-sitter keys
LANGUAGE_ALIAS_MAP = {
    "python": "python",
    "python3": "python",
    "py": "python",
    "javascript": "javascript",
    "js": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "tsx": "tsx",
    "c": "c",
    "cpp": "cpp",
    "c++": "cpp",
    "java": "java",
    "rust": "rust",
    "go": "go",
    "golang": "go",
    "ruby": "ruby",
    "rb": "ruby",
    "php": "php",
    "swift": "swift",
    "kotlin": "kotlin",
    "kt": "kotlin",
    "csharp": "csharp",
    "c#": "csharp",
    "c_sharp": "csharp",
    "lua": "lua",
    "html": "html",
    "css": "css",
    "scss": "scss",
    "json": "json",
    "toml": "toml",
    "yaml": "yaml",
    "markdown": "markdown",
    "md": "markdown",
    "sql": "sql",
    "bash": "bash",
    "sh": "bash",
    "shell": "bash",
    "r": "r",
    "scala": "scala",
    "zig": "zig",
    "dart": "dart",
    "elixir": "elixir",
    "erlang": "erlang",
    "haskell": "haskell",
    "ocaml": "ocaml",
    "perl": "perl",
    "vim": "vim",
    "clojure": "clojure",
    "cmake": "cmake",
    "dockerfile": "dockerfile",
    "docker": "dockerfile",
    "make": "make",
    "xml": "xml",
    "svelte": "svelte",
    "vue": "vue",
    "hcl": "hcl",
    "terraform": "hcl",
    "nix": "nix",
    "gleam": "gleam",
    "v": "v",
    "asm": "asm",
    "ini": "ini",
}

# Display names for statusbar
LANGUAGE_DISPLAY_NAMES = {
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "tsx": "TSX",
    "c": "C",
    "cpp": "C++",
    "java": "Java",
    "rust": "Rust",
    "go": "Go",
    "ruby": "Ruby",
    "php": "PHP",
    "swift": "Swift",
    "kotlin": "Kotlin",
    "csharp": "C#",
    "lua": "Lua",
    "html": "HTML",
    "css": "CSS",
    "scss": "SCSS",
    "json": "JSON",
    "toml": "TOML",
    "yaml": "YAML",
    "markdown": "Markdown",
    "sql": "SQL",
    "bash": "Bash",
    "r": "R",
    "scala": "Scala",
    "zig": "Zig",
    "dart": "Dart",
    "elixir": "Elixir",
    "erlang": "Erlang",
    "haskell": "Haskell",
    "ocaml": "OCaml",
    "perl": "Perl",
    "vim": "Vim",
    "clojure": "Clojure",
    "cmake": "CMake",
    "dockerfile": "Dockerfile",
    "make": "Makefile",
    "xml": "XML",
    "svelte": "Svelte",
    "vue": "Vue",
    "hcl": "HCL",
    "nix": "Nix",
    "gleam": "Gleam",
    "v": "V",
    "asm": "Assembly",
    "ini": "INI",
}

QUERIES_DIR = Path(__file__).parent / "queries"


class TreeSitterHighlighter:
    """Syntax highlighter using Tree-sitter for incremental parsing.

    Uses tree-sitter-language-pack for grammar bindings and bundled
    highlights.scm query files for capture-based syntax highlighting.
    Supports incremental re-parsing via tree.edit() for fast updates.
    """

    def __init__(self, text: Text, language: str = None, *args, **kwargs) -> None:
        self.text: Text = text
        self.base: App = text.base
        self.parser: Parser | None = None
        self.tree = None
        self.query: Query | None = None
        self.language_name: str | None = None
        self.tag_colors: dict = self.base.theme.treesitter_syntax

        if not TREE_SITTER_AVAILABLE:
            return

        self._setup_language(language)
        self.setup_highlight_tags()

    def _setup_language(self, language: str = None) -> None:
        """Initialize parser and highlight query for the given language."""
        lang_key = self._resolve_language(language)
        if not lang_key:
            return

        try:
            self.parser = get_parser(lang_key)
            ts_language = get_language(lang_key)
            query_text = self._load_highlight_query(lang_key)
            if query_text:
                self.query = Query(ts_language, query_text)
            self.language_name = lang_key
        except Exception:
            self.parser = None
            self.query = None
            self.language_name = None

    def _resolve_language(self, language: str = None) -> str | None:
        """Map filename extension or language name to a language-pack key."""
        if language:
            key = language.lower().strip()
            if key in LANGUAGE_ALIAS_MAP:
                return LANGUAGE_ALIAS_MAP[key]
            # Try direct key (might already be a valid key)
            return key if self._is_valid_language(key) else None

        # Auto-detect from file extension
        if self.text.path:
            _, ext = os.path.splitext(self.text.path)
            if ext in EXTENSION_MAP:
                return EXTENSION_MAP[ext]
            # Special case: files like Makefile, Dockerfile (no extension)
            basename = os.path.basename(self.text.path)
            if basename == "Makefile" or basename == "makefile":
                return "make"
            if basename == "Dockerfile":
                return "dockerfile"
            if basename == "CMakeLists.txt":
                return "cmake"

        return None

    def _is_valid_language(self, key: str) -> bool:
        """Check if a language key is available in tree-sitter-language-pack."""
        try:
            get_language(key)
            return True
        except Exception:
            return False

    def _load_highlight_query(self, lang_key: str) -> str | None:
        """Load highlights.scm from the bundled queries directory."""
        query_path = QUERIES_DIR / lang_key / "highlights.scm"
        if query_path.exists():
            return query_path.read_text(encoding="utf-8")
        return None

    def get_display_name(self) -> str:
        """Get human-readable language name for statusbar."""
        if self.language_name and self.language_name in LANGUAGE_DISPLAY_NAMES:
            return LANGUAGE_DISPLAY_NAMES[self.language_name]
        if self.language_name:
            return self.language_name.replace("_", " ").title()
        return "Plain Text"

    def get_language_alias(self) -> str:
        """Get language alias for internal use."""
        return self.language_name or "text"

    def setup_highlight_tags(self) -> None:
        """Configure Tkinter text tags for each Tree-sitter capture name."""
        for capture_name, props in self.tag_colors.items():
            tag = f"ts.{capture_name}"
            if isinstance(props, dict):
                config = {}
                for k, v in props.items():
                    if k == "font" and isinstance(v, dict):
                        f = self.base.settings.font.copy()
                        f.config(**v)
                        config["font"] = f
                    else:
                        config[k] = v
                self.text.tag_configure(tag, **config)
            else:
                self.text.tag_configure(tag, foreground=props)

    def clear(self) -> None:
        """Remove all Tree-sitter highlight tags."""
        for capture_name in self.tag_colors:
            self.text.clear_tag(f"ts.{capture_name}")

    def highlight(self) -> None:
        """Full parse and highlight (used on file load / language change)."""
        if not self.parser or not self.query:
            return

        code = self.text.get_all_text()
        code_bytes = code.encode("utf-8")
        self.tree = self.parser.parse(code_bytes)
        self._apply_highlights_full()

    def incremental_highlight(self, edit_info: dict) -> None:
        """Incremental parse after an edit for fast updates."""
        self.batch_incremental_highlight([edit_info])

    def batch_incremental_highlight(self, edits: list[dict]) -> None:
        """Process multiple edits at once for better performance."""
        if not self.tree or not self.parser or not self.query:
            self.highlight()
            return

        for edit in edits:
            self.tree.edit(
                start_byte=edit["start_byte"],
                old_end_byte=edit["old_end_byte"],
                new_end_byte=edit["new_end_byte"],
                start_point=edit["start_point"],
                old_end_point=edit["old_end_point"],
                new_end_point=edit["new_end_point"],
            )

        try:
            code_bytes = self.text.get_all_text().encode("utf-8")
            new_tree = self.parser.parse(code_bytes, self.tree)
            changed_ranges = self.tree.changed_ranges(new_tree)
            self.tree = new_tree

            if changed_ranges:
                self._apply_highlights_incremental(changed_ranges)
        except Exception:
            # If incremental fails, fallback to full
            self.highlight()

    def _apply_highlights_full(self) -> None:
        """Clear all tags and re-apply highlights from scratch."""
        # Clear all existing tree-sitter tags
        for capture_name in self.tag_colors:
            self.text.clear_tag(f"ts.{capture_name}")

        if not self.tree or not self.query:
            return

        cursor = QueryCursor(self.query)
        captures = cursor.captures(self.tree.root_node)

        for capture_name, nodes in captures.items():
            tag = self._resolve_tag(capture_name)
            if not tag:
                continue
            for node in nodes:
                start = f"{node.start_point[0] + 1}.{node.start_point[1]}"
                end = f"{node.end_point[0] + 1}.{node.end_point[1]}"
                self.text.tag_add(tag, start, end)

    def _apply_highlights_incremental(self, changed_ranges) -> None:
        """Re-highlight only the changed ranges for speed."""
        # Clear tags in changed regions
        for r in changed_ranges:
            start = f"{r.start_point[0] + 1}.{r.start_point[1]}"
            end = f"{r.end_point[0] + 1}.{r.end_point[1]}"
            for capture_name in self.tag_colors:
                self.text.tag_remove(f"ts.{capture_name}", start, end)

        # Re-apply highlights in changed regions
        for r in changed_ranges:
            cursor = QueryCursor(self.query)
            cursor.set_byte_range(r.start_byte, r.end_byte)
            captures = cursor.captures(self.tree.root_node)

            for capture_name, nodes in captures.items():
                tag = self._resolve_tag(capture_name)
                if not tag:
                    continue
                for node in nodes:
                    start = f"{node.start_point[0] + 1}.{node.start_point[1]}"
                    end = f"{node.end_point[0] + 1}.{node.end_point[1]}"
                    self.text.tag_add(tag, start, end)

    def _resolve_tag(self, capture_name: str) -> str | None:
        """Resolve a capture name to a Tkinter tag, with fallback to parent."""
        tag = f"ts.{capture_name}"
        if capture_name in self.tag_colors:
            return tag

        # Hierarchical fallback: "keyword.function" -> "keyword"
        if "." in capture_name:
            parent = capture_name.split(".")[0]
            if parent in self.tag_colors:
                return f"ts.{parent}"

        return None

    def detect_language(self) -> None:
        """Re-detect language from filename and refresh highlighting."""
        old_lang = self.language_name
        self.language_name = None
        self.parser = None
        self.query = None
        self.tree = None

        self._setup_language(None)
        self.setup_highlight_tags()

        if self.language_name != old_lang:
            self.highlight()

    def change_language(self, language: str) -> None:
        """Switch to a different language and re-highlight."""
        self.language_name = None
        self.parser = None
        self.query = None
        self.tree = None

        self._setup_language(language)
        self.setup_highlight_tags()
        self.highlight()
