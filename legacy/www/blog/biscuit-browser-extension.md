# I Put a Browser in My IDE and Watched the World Cup

The 2026 World Cup is on. Every screen in sight is tuned in — bars, phones,会议室 meeting rooms with "urgent" calendar blocks. And I was sitting in front of my editor, trying to ship before the final whistle.

Then it hit me: instead of reaching for my phone, why not bring the match *into* the one app I'm already glued to?

## The IDE

Biscuit is a native Python IDE built entirely with Tkinter. Sub-20 MB on disk, no Electron, no node_modules horror. It has tabs, panels, a debugger, LSP integration, Git support — and an extension system that loads Python packages from `~/.biscuit/extensions/`.

Extensions drop in as folders with a `setup(api)` entry point and get full access to the application via the `ExtensionsAPI` — editors, tabs, command palette, notifications, you name it.

## The Extension

The idea was simple: a browser as an editor tab. URL bar, back/forward/reload, and a real Chromium engine underneath. None of that basic-HTML-renderer stuff — I needed YouTube.

### The Engine

Microsoft Edge WebView2 is the same Chromium engine that powers Edge. On Windows it ships with the OS or can be auto-installed. The Python package `tkwebview2` wraps it and reparents the native control into a Tkinter frame. The result is a full-fledged Chromium tab living inside a Tkinter window.

The extension uses `BaseEditor` — the same base class Biscuit's text editor and diff viewer use — so it integrates completely: breadcrumbs, tab management, the whole editor lifecycle.

### The Structure

```
browser/
├── pyproject.toml
├── README.md
└── src/
    └── browser/
        ├── __init__.py          # setup(api) entry point
        └── extension.py         # BrowserEditor + Browser extension class
```

The `__init__.py` is a one-liner:

```python
def setup(api: "ExtensionsAPI") -> None:
    api.register("browser", Browser(api))
```

The extension registers a command in `install()`:

```python
class Browser(Extension):
    def install(self) -> None:
        self.api.commands.register_command(
            "Browser: Open New Tab", self.open_browser
        )
```

`open_browser` creates a `BrowserEditor` instance and adds it as a tab:

```python
def open_browser(self, *_args) -> None:
    editor = BrowserEditor(self.api.editorsmanager)
    self.api.editors.add_editor(editor)
```

The `BrowserEditor` itself extends `BaseEditor`, with a nav bar on top and the WebView2 below. The nav uses Biscuit's built-in `IconButton` widgets with codicon icons — `ARROW_LEFT`, `ARROW_RIGHT`, `REFRESH` — so it blends perfectly with the editor's native look.

```python
class BrowserEditor(BaseEditor):
    name = "browser"

    def __init__(self, master, url: str = "https://www.google.com") -> None:
        super().__init__(master, path=None, editable=False)
        self.filename = "Browser"
        ...
        self._build_navbar()
        self._build_content()

    def _init_webview2(self) -> None:
        self._browser = WebView2(self.browser_container, 100, 100)
        self._browser.grid(row=0, column=0, sticky=tk.NSEW)
```

## The Match

I pushed the extension to the [Biscuit Extensions Repository](https://github.com/tomlin7/biscuit-extensions), where it joined `rust` and `clangd` in the official marketplace. Now anyone can install it with a single command:

```bash
biscuit ext install browser
```

Or through the built-in Extensions view in Biscuit.

I ran that command, opened the palette (`Ctrl+Shift+P`), typed "Browser: Open New Tab", and a new tab appeared — clean, dark-themed, indistinguishable from a file editor.

I typed `youtube.com`, searched for the World Cup stream, and there it was. Live football, running inside a Tkinter IDE tab. The same Chromium engine that powers Edge, rendering a football match inside a Python app under 20 MB.

## The Split-View Moment

Biscuit has a built-in Python debugger. I opened my debugging session in one tab, the browser in the next. Split-view — breakpoints on the left, football on the right. I'd hit `F5`, watch variables populate, glance over at the score, step through a frame, see a goal replay.

At one point I called `evaluate_js` from the extension API to pull the page title:

```python
def get_title(self):
    if self._browser:
        return self._browser.evaluate_js("document.title")
```

It returned `"Argentina vs France | FIFA World Cup 2026"`.

That was the moment it stopped being a toy.

## Live on the Marketplace

The extension is now live on the [Biscuit Extensions Marketplace](https://biscuit-extensions.github.io/marketplace). You can find it with:

```bash
biscuit ext list          # shows browser in the list
biscuit ext info browser  # details
biscuit ext install browser  # one-command install
```

Under the hood, `biscuit ext install browser` clones the extension submodule from the central repository, registers it in `installed.toml`, and calls `setup(api)`. No restart needed — the extension server hot-loads it immediately.

The whole thing is ~180 lines of Python. No TypeScript. No build step. Just Tkinter frames and a WebView2 wrapper.

## What This Says

This isn't about watching football in an editor — it's about what becomes possible when you build a native, extensible IDE. The extension API gives you real tabs, real frame embedding, real native UI. A browser becomes just another editor type, indistinguishable from the text editor or the diff viewer.

And the marketplace means anyone can share theirs in under a minute.

Here's the repository: [github.com/tomlin7/biscuit-extensions](https://github.com/tomlin7/biscuit-extensions)
Here's the extension source: `extensions/browser/` in that repo.

Install it, open a tab, and ship your next feature without missing a single goal.
