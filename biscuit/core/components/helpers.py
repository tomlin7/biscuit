"""Helper functions for the core components."""

import webbrowser


def search_google(query: str) -> None:
    webbrowser.open(f"https://www.google.com/search?q={query}")
