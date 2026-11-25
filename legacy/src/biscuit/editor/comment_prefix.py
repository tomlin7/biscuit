from ..language.languages import Languages

comment_prefix_map = {
    Languages.PYTHON: "#",
    Languages.JULIA: "#",
    Languages.VB_NET: "'",
    Languages.JAVASCRIPT: "//",
    Languages.TYPESCRIPT: "//",
    Languages.C: "//",
    Languages.CPP: "//",
    Languages.CSHARP: "//",
    Languages.D: "//",
    Languages.RUBY: "#",
    Languages.PHP: "//",
    Languages.RUST: "//",
    Languages.SWIFT: "//",
    Languages.GO: "//",
    Languages.KOTLIN: "//",
    Languages.JAVA: "//",
    Languages.SCALA: "//",
    Languages.HASKELL: "--",
    Languages.SQL: "--",
    Languages.BASH: "#",
    Languages.POWERSHELL: "#",
    Languages.JSON: "//",
    Languages.YAML: "#",
    Languages.TOML: "#",
    Languages.LUA: "--",
    Languages.DART: "//",
}


def get_comment_prefix(language: str) -> str:
    """Get the comment prefix for a language."""

    return comment_prefix_map.get(language, None)


def register_comment_prefix(language: str, prefix: str):
    """Register a comment prefix for a language."""

    comment_prefix_map[language] = prefix
