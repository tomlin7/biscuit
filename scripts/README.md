# Installation Guide ⚙️

This guide will help you install Biscuit on your system. Biscuit is available for Windows and Linux operating systems. This guide will cover the installation process for both windows and linux. Mac is not supported at the moment but you can try running from the source code.

Python 3.10 or higher is required to run Biscuit. You can download Python from the [official website](https://www.python.org/downloads/).

## Installing from source code

If you want access to the latest features and updates, you can install Biscuit from the source code. Make sure you **clone the repository** to your local machine before proceeding with the installation.

### Using Poetry

We recommend using [Poetry](https://python-poetry.org/) to manage the dependencies for the project. You can install Poetry using the following command:

```bash
pip install poetry
```

After installing poetry, you can install the dependencies using the following command:

```bash
poetry install
```

Once the dependencies are installed, you can run Biscuit using the following command:

```bash
poetry run biscuit
```

### Using pip

If you don't want to use Poetry, you can install the dependencies using pip. You can install the dependencies using the following command:

```bash
pip install -r requirements.txt -e .
```

Once the dependencies are installed, you can run Biscuit using the following command:

```bash
cd src
python -m biscuit
```

Or you can install Biscuit using git and pip:

```bash
pip install git+https://github.com/tomlin7/biscuit
```

## Building Biscuit

Biscuit is compiled into standalone executable files using [pyinstaller](https://pyinstaller.org/). Following steps reveal the process of building Biscuit from source code.

Install the required packages:

```
pip install pyinstaller biscuit-editor
```

Load the `windows.spec` or `linux.spec` file in pyinstaller with following command

```
pyinstaller scripts/windows.spec
```

This will generate a standalone executable file in `dist/`.
