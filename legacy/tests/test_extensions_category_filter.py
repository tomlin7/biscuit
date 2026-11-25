from biscuit.views.extensions.category_filter import ExtensionCategory, ExtensionCategoryFilter


def test_category_filter_all():
    filt = ExtensionCategoryFilter()
    items = [
        {"name": "dark-theme", "category": "Themes"},
        {"name": "py-lsp", "category": "Language Servers"},
    ]
    assert len(filt.filter_list(items)) == 2


def test_category_filter_specific():
    filt = ExtensionCategoryFilter()
    items = [
        {"name": "solarized", "category": "Themes", "tags": ["theme", "syntax"]},
        {"name": "pylsp", "category": "Language Servers", "tags": ["lsp"]},
        {"name": "black", "category": "Formatters", "tags": ["formatter"]},
        {"name": "gemini-helper", "category": "AI", "tags": ["ai", "assistant"]},
        {"name": "python-debugger", "category": "Debuggers", "tags": ["debugger"]},
    ]

    assert len(filt.filter_list(items, ExtensionCategory.THEMES)) == 1
    assert filt.filter_list(items, ExtensionCategory.THEMES)[0]["name"] == "solarized"

    assert len(filt.filter_list(items, ExtensionCategory.AI)) == 1
    assert filt.filter_list(items, ExtensionCategory.AI)[0]["name"] == "gemini-helper"

    assert len(filt.filter_list(items, ExtensionCategory.DEBUGGERS)) == 1
    assert filt.filter_list(items, ExtensionCategory.DEBUGGERS)[0]["name"] == "python-debugger"
