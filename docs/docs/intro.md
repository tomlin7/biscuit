---
sidebar_position: 1
---

Welcome to the contributing guidelines for Biscuit. This document will help you get started with contributing to Biscuit.

## Setting up Environment

[**Fork**](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the Biscuit repository and clone locally. 
```bash
git clone http://github.com/billyeatcookies/biscuit
```
Run `pip install -r requirements.txt` or `poetry install`, your preference. Try to run biscuit once with `python -m biscuit` and make sure everything looks good.

### What you'll need

- [Python](https://python.org/en/download/) 3.10 or above

## Generate a new site

Generate a new Docusaurus site using the **classic template**.

The classic template will automatically be added to your project after you run the command:

```bash
npm init docusaurus@latest my-website classic
```

You can type this command into Command Prompt, Powershell, Terminal, or any other integrated terminal of your code editor.

The command also installs all necessary dependencies you need to run Docusaurus.

## Start your site

Run the development server:

```bash
cd my-website
npm run start
```

The `cd` command changes the directory you're working with. In order to work with your newly created Docusaurus site, you'll need to navigate the terminal there.

The `npm run start` command builds your website locally and serves it through a development server, ready for you to view at http://localhost:3000/.

Open `docs/intro.md` (this page) and edit some lines: the site **reloads automatically** and displays your changes.
