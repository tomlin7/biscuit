![image](https://github.com/user-attachments/assets/a578d600-a4a8-4ce4-904d-4aa0e73fc124)

Aesthetic, lightweight code editor with extension support. Draws inspiration from mainstream editors like VSC, Zed, and Vim. Hobby project. 
> - - - -  Check all extensions and their authors [`~extension repository`](https://tomlin7.github.io/biscuit-extensions/)
> - - - -  Contributing/User guides, API reference [`~documentation`](https://tomlin7.github.io/biscuit)
> - - - -  Scroll down to see list of all supported [`~features`](https://github.com/tomlin7/biscuit?tab=readme-ov-file#features) 

![image](https://github.com/user-attachments/assets/3ff11be7-754b-4159-87bd-0cf48406821d)
> Theme inspired by [`morhetz/gruvbox`](https://github.com/morhetz/gruvbox)

## `Installing`

Install the latest release from PyPI by running:
```bash
> pip install biscuit-editor
```
Quickly open up a project using **`biscuit path/to/src`** and start editing. See other [installation methods](https://tomlin7.github.io/biscuit/getting-started/installation/).

## `Contributing`

- - - Please check the [docs](https://tomlin7.github.io/biscuit/getting-started/quick-start/) and [contributing guide](https://github.com/tomlin7/Biscuit/blob/main/CONTRIBUTING.md) for a quick tour of the project structure and to set up the environment. 
- - - To make a new extension, read the [extension docs](https://github.com/tomlin7/biscuit-extensions)

<a href="https://github.com/tomlin7/biscuit/graphs/contributors">
  <img src="https://opencollective.com/biscuit/contributors.svg" />
</a><br>

## `Features`

### Language Server Support

- code completions
- hover
- symbol outline (palette `Ctrl + J`)
- symbol references
- goto-definition/declaration

More language servers are registered through extensions, see the [Rust](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/rust.py), [Typescript](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/javascript_typescript.py) extensions
for reference. Feel free to open issues/discussions for help!

![peek](https://github.com/user-attachments/assets/16350a91-8d87-422d-b779-1db21033e979)

<table>
    <tr>
        <img src=https://github.com/tomlin7/biscuit/assets/70792552/36589a2d-8f5f-4196-bc88-5b1800492076 height=270>
    </tr>
    <tr> 
        <img src=https://github.com/tomlin7/biscuit/assets/70792552/68a26ccb-b309-4c21-b75e-3e5cf5fa6500 height=270>
    </tr><br>
    <figcaption>
        <a href=https://github.com/tomlin7/biscuit/blob/main/src/biscuit/settings/theme/vscdark.py><code>Biscuit VS dark theme</code></a>
    </figcaption>
</table>

### Breakpoint-based Code Debugging

- breakpoints in multiple files
- variable inspection
- modify variables at runtime
- call stack

Built-in Python debugger is available right now, more debuggers can be registered through extensions.
- TODO: Debugger Adapter Protocol support, [DAP client](https://github.com/tomlin7/debug-adapter-client) integration

![breakpoint](https://github.com/user-attachments/assets/a34d6e59-4743-43ee-a1a1-b7a5eac589bf)

### Git Support
- Diff viewer
- Git operations GUI-fied (push, pull, commit, stage, unstage, switch branches)
- Clone repositories within editor, and open them up
- View GitHub issues/pr within editor (NOTE: will be converted to an extension)

![image](https://github.com/user-attachments/assets/c23c0338-7c19-4636-831e-3d97b539df46)
![image](https://github.com/user-attachments/assets/41cdbe73-4b24-4502-95f6-fcc17a2002be)

### Assistant

- Attach files for context in chat
- Generate terminal commands within integrated terminal (use `# prompt` in terminal, then accept/decline response)
- Run local LLMs with Ollama extension
- Google Gemini built-in support (key)
  
More providers can be added with extensions, see [ollama extension](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/ollama.py) for reference.

![Assistant](https://github.com/user-attachments/assets/898d5223-87c2-4368-acd2-8ae060daab70)

### Workspace Search
- regex support
- file preview, occurrence count, etc
- search within editors with find-replace widget

![image](https://github.com/user-attachments/assets/6dd1baa2-c89c-437d-9613-00e72fa9e009)

### More features
- **Integrated Terminals**
  - Set up and store run command for each editor for ease
  - Use `# prompt here...` commands to generate commands with assistant (key)
  - Multiple terminals can be opened (Built in support for powershell, bash, cmd, python REPL, etc.)
  
  ![image](https://github.com/user-attachments/assets/733fbd70-8377-4907-92fa-83e0dcad9368)

- **Extension center**
  - Install and manage all available extensions
  - Filter all installed extensions
  - Search for extensions
  
  ![image](https://github.com/user-attachments/assets/9f6d67f2-b00f-43e6-804a-8f66e03b8183)

- Split-pane **Markdown** editor, HTML renderer
  - Split-pane editing
  - Syntax highlighting support
  - TODO: CSS support for HTML editor
  
  ![image](https://github.com/user-attachments/assets/ac086e4d-023e-4dd1-ae26-96271d900656)

- Rich Command palette (commands added to [commands.py](https://github.com/tomlin7/biscuit/blob/main/src/biscuit/commands.py) are automatically made available)
- **Drag and drop** to open files or folders in Biscuit
- Built-in [editorconfig](https://editorconfig.org/) support
- Toggle relative line numbering
- Formatter extensions support
  - See [black](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/black.py), [Ruff](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/ruff.py), [YAPF](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/yapf.py), [autopep8](https://github.com/tomlin7/biscuit-extensions/blob/main/extensions/autopep8.py) for reference.
  
  ![image](https://github.com/user-attachments/assets/73a86fb6-89f8-4cd9-8552-5c1fb9c2e3b0)


## `License`

Biscuit uses the MIT License. For more information, see [LICENSE.md](https://github.com/tomlin7/Biscuit/blob/main/LICENSE.md).

<a href=https://github.com/tomlin7/Biscuit/actions/workflows/nightly.yml><img src="https://img.shields.io/github/actions/workflow/status/tomlin7/biscuit/nightly.yml"></a> 
<img alt="Project License" src="https://img.shields.io/github/license/tomlin7/Biscuit"> 
<a href=https://github.com/tomlin7/Biscuit/releases> <img alt="Download Latest" src="https://img.shields.io/github/v/release/tomlin7/biscuit"></a>
<img alt="GitHub closed pull requests" src="https://img.shields.io/github/issues-pr-closed-raw/tomlin7/Biscuit">


![image](https://github.com/user-attachments/assets/0df70dbd-b4e2-46ae-9715-045bdf85ed13)
