<h1 align="center">
    <img src="https://github.com/tomlin7/Biscuit/assets/70792552/0ea8e958-92de-4659-b1c9-ab5a72f05d7d" width=500><br>
    <a href=https://github.com/tomlin7/Biscuit/actions/workflows/nightly.yml> 
        <img src="https://img.shields.io/github/actions/workflow/status/tomlin7/biscuit/nightly.yml?style=for-the-badge"> 
    </a> 
    <img alt="Project License" src="https://img.shields.io/github/license/tomlin7/Biscuit?style=for-the-badge"> 
    <a href=https://github.com/tomlin7/Biscuit/releases> 
        <img alt="Download Latest" src="https://img.shields.io/github/v/release/tomlin7/biscuit?style=for-the-badge"> 
    </a>
    <img alt="GitHub closed pull requests" src="https://img.shields.io/github/issues-pr-closed-raw/tomlin7/Biscuit?style=for-the-badge">
</h1>
<h4 align="center">
    <a href=https://github.com/tomlin7/Biscuit/blob/main/CONTRIBUTING.md>Developer Docs</a> • 
    <a href=https://github.com/tomlin7/Biscuit/tree/main?tab=readme-ov-file#features>Screenshots</a> • 
    <a href=https://github.com/tomlin7/Biscuit/releases>Downloads</a> • 
    <a href=https://tomlin7.github.io/biscuit-extensions>Marketplace</a> • 
    <a href=https://github.com/tomlin7/Biscuit/blob/main/CODE_OF_CONDUCT.md>Code of Conduct</a><br><br>
</h1>

A lightweight, fast, and extensible code editor with a wide range of language support and runs with very minimal system requirements. It implements the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) for code completions, refactoring, symbol references, and more. Features include breakpoint-based code debugging, AI assistant integration (Gemini), fast workspace search, and built-in Git support. Scroll down to see [biscuit in action](https://github.com/tomlin7/Biscuit/tree/main?tab=readme-ov-file#features).

- 🎀 Explore all community made extensions and their authors at the [Biscuit Extension Center](https://tomlin7.github.io/biscuit-extensions/)
- 🪛 For developer/user guides or API reference, check the [documentation here](https://tomlin7.github.io/biscuit).

## Installing

You can install the latest release from PyPI by running:

```bash
pip install biscuit-editor
```

Try running `biscuit --version` in your terminal to check if the installation was successful.

#### Standalone Builds

- Grab the latest stable build from [**releases page**](https://github.com/tomlin7/Biscuit/releases)
- Unstable nightly builds from [GitHub actions](https://github.com/tomlin7/Biscuit/actions)

To compile Biscuit from source code, see the [compiling guide](https://github.com/tomlin7/Biscuit/tree/main/scripts).

## Contributing

Your contributions are greatly appreciated! please have a look at our [**developer docs**](https://github.com/tomlin7/Biscuit/blob/main/CONTRIBUTING.md) for an outline of the project and to setup the environment.

<a href="https://github.com/tomlin7/biscuit/graphs/contributors">
  <img src="https://opencollective.com/biscuit/contributors.svg" />
</a>

- For feature suggestions and bug reports, please check [issue tracker](https://github.com/tomlin7/Biscuit/issues)
- Community made Extensions can be published at: [**Biscuit Extensions Repository**](https://github.com/tomlin7/biscuit-extensions)

## Features

## Smart Auto-completions

When the opened file have a recognized and supported file type, and also have language extensions installed, the autocomplete widget will automatically turn on LSP mode, the completions will be handled by registered language server afterwards. LSP mode enables smart and context sensitive code suggestions, as demonstrated below.
When there are no language extensions available/installed, autocomplete widget goes to word mode, the completions will not be context sensitive and can be unexpected.

![Autocompletions](https://github.com/tomlin7/biscuit/assets/70792552/885ebf36-ce18-45a3-ae57-9a4b709331f7)

## Hover for Documentation

Identifiers when hovered pops up a floating window on top, containing the documentation (if there is) of that symbol.

![hover](https://github.com/tomlin7/biscuit/assets/70792552/4f0ba532-4ec0-49c3-ad08-19e8a622a416)

## Goto Definitions by `ctrl` + clicking on symbols

User can jump directly into symbol definitions by `ctrl` + clicking on them, the definition containing script will open up in new/existing tab. If there are multiple definitions, window containing all the definitions will popup right below the symbol to pick from

![gotodef](https://github.com/tomlin7/biscuit/assets/70792552/fb3a012f-1e93-4c00-930c-843a9728b958)

## **Git Support**

![image](https://github.com/tomlin7/Biscuit/assets/70792552/ea231a77-7899-4560-ab97-95828bb96932)

## **Integrated Terminals, Extension center**

![image](https://github.com/tomlin7/Biscuit/assets/70792552/2531ea77-a1e0-4a81-96c9-66ad6b6b0c6d)

## **Split-Pane Markdown Editor**

![image](https://github.com/tomlin7/Biscuit/assets/70792552/2e58ff22-2412-4cb1-b183-673591200308)

## **Command Palette for Quick Access**

![ezgif com-video-to-gif](https://github.com/tomlin7/Biscuit/assets/70792552/e0868336-a15f-4b98-a62e-a822e2211e57)

## **PathView for the Breadcrumbs!**

![pathview](https://imgur.com/CztWtni.jpg)

# License

Biscuit uses the MIT License, please check [LICENSE](https://github.com/tomlin7/Biscuit/blob/main/LICENSE.md).
