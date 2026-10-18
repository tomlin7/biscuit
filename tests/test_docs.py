import json
from pathlib import Path


def test_docs_json_structure_and_pages():
    repo_root = Path(__file__).resolve().parent.parent
    docs_dir = repo_root / "docs"
    docs_json = docs_dir / "docs.json"

    assert docs_json.exists(), "docs/docs.json must exist"

    with open(docs_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "navigation" in data, "docs.json must contain navigation"
    assert "pages" in data["navigation"], "navigation must contain pages"

    navigation_pages = data["navigation"]["pages"]
    missing_pages = []

    for group in navigation_pages:
        assert "group" in group, "Every navigation entry must have a group name"
        assert "pages" in group, f"Group {group.get('group')} must have a pages list"

        for page in group["pages"]:
            candidates = [
                docs_dir / f"{page}.mdx",
                docs_dir / f"{page}.md",
                docs_dir / page / "index.mdx",
                docs_dir / page / "index.md",
            ]
            if not any(cand.exists() for cand in candidates):
                missing_pages.append(page)

    assert not missing_pages, f"The following doc pages referenced in docs.json are missing on disk: {missing_pages}"


def test_docs_assets_exist():
    repo_root = Path(__file__).resolve().parent.parent
    docs_dir = repo_root / "docs"
    docs_json = docs_dir / "docs.json"

    with open(docs_json, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "favicon" in data:
        favicon_path = data["favicon"].lstrip("/")
        assert (docs_dir / favicon_path).exists(), f"Favicon {data['favicon']} not found in docs/"

    if "logo" in data:
        if "light" in data["logo"]:
            light_logo = data["logo"]["light"].lstrip("/")
            assert (docs_dir / light_logo).exists(), f"Light logo {data['logo']['light']} not found in docs/"
        if "dark" in data["logo"]:
            dark_logo = data["logo"]["dark"].lstrip("/")
            assert (docs_dir / dark_logo).exists(), f"Dark logo {data['logo']['dark']} not found in docs/"
