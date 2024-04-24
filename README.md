<h1 align="center">
    <img src="https://github.com/tomlin7/Biscuit/assets/70792552/0ea8e958-92de-4659-b1c9-ab5a72f05d7d" width=700><br>
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
    <a href=https://github.com/tomlin7/Biscuit/tree/main?tab=readme-ov-file#features>Features</a> • 
    <a href=https://github.com/tomlin7/Biscuit/blob/main/CONTRIBUTING.md>Developer Docs</a> • 
    <a href=https://github.com/tomlin7/Biscuit/blob/main/CODE_OF_CONDUCT.md>Code of Conduct</a> • 
    <a href=https://github.com/tomlin7/Biscuit/releases>Downloads</a> • 
    <a href=https://tomlin7.github.io/biscuit-extensions>Marketplace</a><br><br>
    <img src="https://github.com/tomlin7/biscuit/assets/70792552/75c1eaf8-04d1-4945-859f-52b32b36d529" width=2000><br><br>
    <code>"Life is short, eat more biscuits."</code>
</h1>

Biscuit is a lightweight, awesome code editor for any language. Biscuit supports essential language features such as Smart Code Completions, Syntax highlighting, etc. We wrote it in python, using only tkinter for GUI. It's a great alternative to [insert funny thing here]! Scroll down to see [some of the features](https://github.com/tomlin7/Biscuit/tree/main?tab=readme-ov-file#features). 

- Explore all community made extensions & authors at [Biscuit Extensions Marketplace](https://tomlin7.github.io/biscuit-extensions/)
- For developer/user guides or API reference, read the [documentation](https://tomlin7.github.io/biscuit).

## Installing  
- Download latest **stable builds** from [**releases page**](https://github.com/tomlin7/Biscuit/releases).
- Nightly builds from [github actions page](https://github.com/tomlin7/Biscuit/actions).

To compile Biscuit for your platform, see [compiling guide](https://github.com/tomlin7/Biscuit/tree/main/scripts). 

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
User can jump directly into symbol definitions by  `ctrl` + clicking on them, the definition containing script will open up in new/existing tab. If there are multiple definitions, window containing all the definitions will popup right below the symbol to pick from

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
