---
sidebar_position: 1
---

Welcome to the developer's documentation for Biscuit. This is a work in progress, so please be patient. If you have any questions, feel free to join the [tkinter discord community](https://dsc.gg/tkinter) and ask in the `#biscuit` channel. 


## What is Biscuit?

Biscuit is a lightweight, easy to use code editor for any language. We wrote it in python, using only tkinter for GUI. It's a great alternative to [insert funny thing here]!

## Setting up Environment

Python 3.10 or above is required for building Biscuit.

[**Fork**](https://docs.github.com/en/get-started/quickstart/fork-a-repo) the Biscuit repository and clone locally. 
```bash
git clone http://github.com/tomlin7/biscuit
```
Run `pip install -r requirements.txt` or `poetry install`, your preference. Try to launch biscuit once with `python -m biscuit` and make sure everything looks good.


> [!IMPORTANT]
> Linux distros require some prerequisites to be installed prior to the pip installation
> ```bash
>  sudo apt install python3-dev tcl-dev tk-dev \
>    fontconfig libfontconfig1 libfontconfig1-dev \
>    cmake cmake-data extra-cmake-modules build-essential
>  python -m pip install scikit-build
> ```

### What you'll need

- [Python](https://python.org/en/download/) 3.10 or above
- [Poetry](https://python-poetry.org/docs/#installation) (optional)
