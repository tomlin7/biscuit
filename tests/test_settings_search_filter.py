from types import SimpleNamespace
from biscuit.settings.editor.search_filter import SettingsSearchFilter


def test_search_filter_matches():
    assert SettingsSearchFilter.matches("Font Size", "Editor font size in pixels", "font") is True
    assert SettingsSearchFilter.matches("Font Size", "Editor font size in pixels", "pixels") is True
    assert SettingsSearchFilter.matches("Color Theme", "UI theme", "size") is False
    assert SettingsSearchFilter.matches("Color Theme", None, "") is True


def test_search_filter_items():
    items = [
        SimpleNamespace(name="Font Size", description="Editor font size"),
        SimpleNamespace(name="Tab Size", description="Number of spaces per tab"),
        SimpleNamespace(name="Word Wrap", description="Wrap long lines"),
    ]

    filtered = SettingsSearchFilter.filter_items(items, "size")
    assert len(filtered) == 2
    assert {i.name for i in filtered} == {"Font Size", "Tab Size"}

    filtered_wrap = SettingsSearchFilter.filter_items(items, "wrap")
    assert len(filtered_wrap) == 1
    assert filtered_wrap[0].name == "Word Wrap"
