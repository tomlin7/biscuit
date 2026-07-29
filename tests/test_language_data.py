import pytest

from biscuit.language.data import (
    Completion,
    CompletionRequest,
    Completions,
    Diagnostic,
    Diagnostics,
    HoverResponse,
    Jump,
    JumpLocationRange,
    JumpRequest,
    TextEdit,
    WorkspaceEdit,
    WorkspaceEdits,
)
from biscuit.language.languages import Languages


class TestLanguages:
    def test_has_python(self):
        assert Languages.PYTHON == "python"

    def test_has_javascript(self):
        assert Languages.JAVASCRIPT == "javascript"

    def test_has_rust(self):
        assert Languages.RUST == "rust"

    def test_has_cpp(self):
        assert Languages.CPP == "cpp"

    def test_has_go(self):
        assert Languages.GO == "go"

    def test_has_html(self):
        assert Languages.HTML == "html"

    def test_has_css(self):
        assert Languages.CSS == "css"

    def test_has_markdown(self):
        assert Languages.MARKDOWN == "markdown"

    def test_has_typescript(self):
        assert Languages.TYPESCRIPT == "typescript"

    def test_has_json(self):
        assert Languages.JSON == "json"

    def test_has_toml(self):
        assert Languages.TOML == "toml"

    def test_has_yaml(self):
        assert Languages.YAML == "yaml"

    def test_supported_languages_count(self):
        langs = [a for a in dir(Languages) if not a.startswith("_")]
        assert len(langs) > 500

    def test_no_duplicates(self):
        values = []
        for attr in dir(Languages):
            if not attr.startswith("_"):
                v = getattr(Languages, attr)
                assert v not in values or v == attr.lower(), f"Duplicate: {v}"
                values.append(v)


class TestLanguageData:
    def test_diagnostic_creation(self):
        d = Diagnostic(start="1.0", end="1.5", message="test error", severity=1)
        assert d.start == "1.0"
        assert d.end == "1.5"
        assert d.message == "test error"
        assert d.severity == 1

    def test_diagnostic_repr(self):
        d = Diagnostic(start="2.3", end="2.8", message="error msg", severity=1)
        assert repr(d) == "2.3"

    def test_diagnostics(self):
        diags = [Diagnostic(start="1.0", end="1.5", message="e1", severity=1)]
        d = Diagnostics(underline_list=diags)
        assert len(d.underline_list) == 1

    def test_completion_creation(self):
        c = Completion(
            kind=1, display_text="test", replace_start="1.0",
            replace_end="1.4", replace_text="test()", filter_text="test",
            documentation="A test function"
        )
        assert c.kind == 1
        assert c.display_text == "test"
        assert c.replace_text == "test()"
        assert c.documentation == "A test function"

    def test_completion_repr(self):
        c = Completion(kind=1, display_text="foo", replace_start="1.0",
                       replace_end="1.3", replace_text="foo", filter_text="foo",
                       documentation="")
        assert repr(c) == "foo"

    def test_completions(self):
        c = Completion(kind=1, display_text="test", replace_start="1.0",
                       replace_end="1.4", replace_text="test()", filter_text="test",
                       documentation="")
        completions = Completions(id=1, completions=[c])
        assert completions.id == 1
        assert len(completions.completions) == 1

    def test_completion_request(self):
        r = CompletionRequest(id=1, cursor="1.5")
        assert r.id == 1
        assert r.cursor == "1.5"

    def test_hover_response(self):
        h = HoverResponse(location="1.0", text=[("text", "info")], docs="docstring")
        assert h.location == "1.0"
        assert h.docs == "docstring"

    def test_hover_response_repr(self):
        h = HoverResponse(location="1.0", text=[("text", "info")])
        assert repr(h) == "[('text', 'info')]"

    def test_jump_location_range(self):
        j = JumpLocationRange(file_path="/a.py", start="1.0", end="1.5")
        assert j.file_path == "/a.py"
        assert repr(j) == "/a.py"

    def test_jump(self):
        locs = [JumpLocationRange(file_path="/a.py", start="1.0", end="1.5")]
        j = Jump(pos="1.0", locations=locs)
        assert j.pos == "1.0"
        assert len(j.locations) == 1

    def test_jump_request(self):
        r = JumpRequest(file_path="/a.py", location="1.0")
        assert r.file_path == "/a.py"
        assert r.location == "1.0"

    def test_text_edit(self):
        e = TextEdit(start="1.0", end="1.5", new_text="replacement")
        assert e.start == "1.0"
        assert e.new_text == "replacement"

    def test_workspace_edit(self):
        edits = [TextEdit(start="1.0", end="1.5", new_text="new")]
        we = WorkspaceEdit(file_path="/a.py", edits=edits)
        assert we.file_path == "/a.py"

    def test_workspace_edits(self):
        edits = [WorkspaceEdit(file_path="/a.py", edits=[])]
        wes = WorkspaceEdits(edits=edits)
        assert len(wes.edits) == 1
