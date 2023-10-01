<h2 align="center">
    <img src="https://github.com/billyeatcookies/Biscuit/assets/70792552/0ea8e958-92de-4659-b1c9-ab5a72f05d7d" width=700><br>
    <a href=https://github.com/billyeatcookies/Biscuit/actions/workflows/artifact-windows.yml> 
        <img src="https://img.shields.io/github/actions/workflow/status/billyeatcookies/biscuit/artifact-windows.yml?style=for-the-badge"> 
    </a> 
    <img alt="Project License" src="https://img.shields.io/github/license/billyeatcookies/Biscuit?style=for-the-badge"> 
    <a href=https://github.com/billyeatcookies/Biscuit/releases> 
        <img alt="Download Latest" src="https://img.shields.io/github/v/release/billyeatcookies/biscuit?style=for-the-badge"> 
    </a>
    <img alt="GitHub closed pull requests" src="https://img.shields.io/github/issues-pr-closed-raw/billyeatcookies/Biscuit?style=for-the-badge">
</h2>
<h1>
    <img src="https://github.com/billyeatcookies/Biscuit/assets/70792552/a990845c-bd71-49d2-9d51-58153215c871" width=2000><br>
</h1>

Biscuit is a text editor written fully in Python using the tkinter library. With invaluable contributions from passionate collaborators, Biscuit has made significant progress in incorporating essential features such as syntax highlighting, autocompletions, and **Git integration**. Biscuit also supports extensions, see the documentation at [Extension API](https://billyeatcookies.github.io/biscuit) to learn further. It takes inspiration from many popular code editors while also adding its own unique flair.

## Running Biscuit 💿 
You can download the latest compiled builds of Biscuit for Windows and Linux from [Releases](https://github.com/billyeatcookies/Biscuit/releases)!

For **Nightly Builds** you can check the [github actions page](https://github.com/billyeatcookies/Biscuit/actions).

### Developing Biscuit ⚒
Bugs and missing or incomplete features will be present in the current unreleased version in main branch.
> **Note:**
> You need **python 3.10** or above.

Download the project source or clone this repo, in the project directory run:
```bash
> pip install -r requirements.txt
> python -m biscuit
```
To run in a separate virtual environment, you can use [python poetry](https://python-poetry.org/). 
To compile Biscuit for your platform, see [compiling guide](https://github.com/billyeatcookies/Biscuit/tree/main/scripts).

> **Note**
> If you are getting an error during installation in **Linux**, install following dependencies and try again:
> ```bash
> > sudo apt install fontconfig libfontconfig1 libfontconfig1-dev cmake cmake-data extra-cmake-modules build-essential
> > pip install scikit-build
> ```

For feature suggestions and bug reports, please check [**issue tracker**](https://github.com/billyeatcookies/Biscuit/issues).

## Contributing ❤ 
The project aims to foster a vibrant open-source community of Python enthusiasts, your contributions and support are greatly appreciated! 🧡 check our [contributing guidelines](./CONTRIBUTING.md) for any questions! 

<a href="https://github.com/billyeatcookies/biscuit/graphs/contributors">
  <img src="https://opencollective.com/biscuit/contributors.svg?width=890" />
</a>

## Screenshots 📸
![python_33z3mLyKaj](https://github.com/billyeatcookies/Biscuit/assets/70792552/acb36423-65f3-46a0-b4a0-9e381b5d1995)
![python_fOxALHL7iv](https://github.com/billyeatcookies/Biscuit/assets/70792552/db279b28-859a-4376-a60e-10890235c729)
![python_haGYWbGzcX](https://github.com/billyeatcookies/Biscuit/assets/70792552/9e75f2c2-6a24-43e4-a3a2-fcaa1728d18c)
![python_MolICK4FSV](https://github.com/billyeatcookies/Biscuit/assets/70792552/6875cb5c-627c-4bae-9fcc-2a15d2a4b2ce)

## Features ✨ 
- **Palette** which works based on various prompts used 
  (`Ctrl` + `shift` + `p` for command palette)

![palette](https://imgur.com/8gKyeks.jpg)

- **Autocompletions** & **Syntax Highlighting** (based on word matching and regex, no language server)

![completion](https://github.com/billyeatcookies/Biscuit/assets/70792552/08fe5cbf-81d7-4770-8a80-d70821bf96c9)

- **PathView** for the **Breadcrumbs!**

![pathview](https://imgur.com/CztWtni.jpg)
