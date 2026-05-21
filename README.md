
[![GitHub](https://img.shields.io/github/license/tomlin7/biscuit)](https://github.com/tomlin7/biscuit/blob/main/LICENSE)
[![PyPI - Version](https://img.shields.io/pypi/v/biscuit-editor)](https://pypi.org/project/biscuit-editor/)
[![PyPI - Downloads](https://img.shields.io/pypi/dm/biscuit-editor)](https://pypi.org/project/biscuit-editor/)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/tomlin7/biscuit)](https://github.com/tomlin7/biscuit/pulse)
[![GitHub last commit](https://img.shields.io/github/last-commit/tomlin7/biscuit)](https://github.com/tomlin7/biscuit/commits/main)
[![GitLab Issues](https://img.shields.io/github/issues/tomlin7/biscuit)](https://github.com/tomlin7/biscuit/issues)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tomlin7/biscuit)

<!--
![image](https://github.com/user-attachments/assets/a578d600-a4a8-4ce4-904d-4aa0e73fc124)
-->

`biscuit` is a fast, extensible, native code editor with agents. lightweight <20 mb in size. install and start using in seconds. 

- explore popular extensions, visit the new [**extension marketplace**](https://biscuit-extensions.github.io/marketplace/) we've been working on
- for developer/user guides & API reference, check [documentation](https://tomlin7.github.io/biscuit), WIP so i recommend checking deepwiki.
- packed with superpowers, [list of features](https://tomlin7.github.io/biscuit/#features)

<img alt="biscuit" src="https://github.com/user-attachments/assets/ac5254cc-e1ac-4fe6-a582-51b5129756e3" />

## `installing`

install the latest release by running:

```bash
> pip install biscuit-editor
```

quickly open up a project using **`biscuit path/to/src`** and start editing. see other [installation methods](https://tomlin7.github.io/biscuit/getting-started/installation/) if you'd like to (like pyinstaller).

<!-- ![home](https://github.com/user-attachments/assets/cd18dcfa-40a9-47b3-aab4-ed38ea3c1715) -->

## `contributing`

- please check the [docs](https://tomlin7.github.io/biscuit/getting-started/quick-start/) and [contributing guide](https://github.com/tomlin7/Biscuit/blob/main/CONTRIBUTING.md) for a quick tour of the project structure and to set up the environment.
- to make a new extension, read the [extension docs](https://github.com/tomlin7/biscuit-extensions) :>
- [support the work](https://github.com/sponsors/tomlin7)

# `PROGRESS` 

### `agents`

- [x] gemini, anthropic API support (`claude-4-5-opus/sonnet/haiku`, `gemini-2-5-flash/pro`)
- [x] planning agent with task list
  - [x] ReadFileTool
  - [x] EditFileTool
  - [x] DeleteFileTool
  - [x] ListDirTool
  - [x] GlobFileSearchTool
  - [x] GrepTool
  - [x] CodebaseSearchTool
  - [x] RunTerminalCmdTool
  - [x] TodoWriteTool
  - [x] GetWorkspaceInfoTool
  - [x] GetActiveEditorTool
- [x] add more LLM providers through biscuit extensions
- [x] attach files for adding context in chat
- [ ] LLM provider extension examples (old ones are now deprecated)
- [x] run local LLMs with ~~[ollama extension](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/ollama.py)~~ (deprecated)
- [ ] ollama extension rewrite 
- [x] LLM calls inside biscuit terminals (use `# your prompt` inside terminal, then accept/decline response)

### `code intelligence`

- [x] fast tree-sitter based parsing and highlights 
- [x] code completions within editor (with icons)
- [x] hover for symbol definition/docstring (rendered with highlights + markdown)
- [x] symbol outline sidebar panel for navigating symbols in open editor
- [x] symbol search through command palette `Ctrl + J`)
- [x] floating peek widget to jump-to-definition/declaration of symbols
- [x] symbol references in open editor
- [x] adding more language servers through biscuit extensions

more language servers are registered through extensions, see the [rust](https://github.com/biscuit-extensions/rust), [clangd](https://github.com/biscuit-extensions/clangd) extensions for reference.

<img alt="lsp and agents" src="https://github.com/user-attachments/assets/30b52da7-af5b-490b-912a-fb8b4d61dcb0" />

### `source control`

- [x] split diff viewer for changes/staged changes
- [x] essential git operations easily accessible (push, pull, commit, stage, unstage, switch branches)
- [x] clone repositories and immediately open in active window, or new window
- [x] view gitHub issues/prs within editor (TODO: disabled rn, will be converted to an extension)

### `fast search`

- [x] ripgrep based fast search, quickly accessible from statusbar
- [x] replace occurrences individually or all at once
- [x] regex support, case sensitive search and more customization
- [x] search within open editors with floating find-replace widget

<img alt="search" src="https://github.com/user-attachments/assets/d4ef7657-f37b-40ab-b9b1-c00d45e7f764" />

### `code debugging`

- [x] setting breakpoints across files
- [x] inspection panel for all runtime variables 
- [x] modify runtime variables while debugging
- [x] call stack visualization and exception tracing
- [ ] full [DAP client](https://github.com/tomlin7/debug-adapter-client) integration
- [x] built-in python debugger
- [x] add debuggers can be registered through biscuit extensions.

### `extensions`

- [x] install and manage all available extensions though a gui
- [x] extension search within biscuit
- [x] extension bootstrapping cli commands and templates
- [x] [extension docs](https://github.com/tomlin7/biscuit-extensions)
- [x] extensions marketplace website: [visit here](https://biscuit-extensions.github.io/marketplace)

<img alt="extensions" src="https://github.com/user-attachments/assets/91ab0044-2eac-4c20-972d-6719002edb1a" />

### `misc`

- [x] split markdown editor, plain HTML renderer
- [x] toggle relative line numbering support
- [ ] vim mode support
- [x] add formatters through biscuit extensions
- [x] formatter extensions: ~~[black](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/black.py)~~ [DEPRECATED], ~~[ruff](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/ruff.py)~~[DEPRECATED], ~~[YAPF](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/yapf.py)~~[DEPRECATED], ~~[autopep8](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/autopep8.py)~~ [DEPRECATED] for reference.
- [x] drag-n-drop to open files or folders in biscuit
- [x] [editorconfig](https://editorconfig.org/) support for projects
- [x] sophisticated command palette (full list of static commands in [src/biscuit/commands](https://github.com/tomlin7/biscuit/blob/main/src/biscuit/commands.py))

<img alt="preview" src="https://github.com/user-attachments/assets/1c44aab4-d8d1-4ba8-b92b-73c0c6dbfb00" />

## `license`

biscuit uses the MIT License, see [LICENSE](https://github.com/tomlin7/Biscuit/blob/main/LICENSE.md) file.
