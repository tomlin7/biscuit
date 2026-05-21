## Installation

!!! Note
    Python 3.11 or above is required for building Biscuit.

Recommended way to install Biscuit is via pip:

```bash
pip install biscuit-editor
```

Try running `biscuit --version` in your terminal to check if the installation was successful.

!!! Info "Pre-requisites for Linux"
    Linux distribtions require some system packages to be installed prior to the installation.

    For Debian based distributions,
    ```bash
    $ sudo apt install fontconfig libfontconfig1 libfontconfig1-dev cmake cmake-data extra-cmake-modules build-essential
    $ python3 -m pip install scikit-build
    ```
    For Arch Linux based distributions,
    ```bash
    $ sudo pacman -Sy
    $ sudo pacman -S base-devel cmake extra-cmake-modules fontconfig tcl tk
    $ python -m pip install scikit-build
    $ python -m pip install tkextrafont
    ```

For compiling from source code, please check the [installation guide](https://github.com/tomlin7/biscuit/tree/main/scripts).

### Alternative Installation Methods

1. **Standalone Builds**: 
   - Grab the latest stable build from [**releases page**](https://github.com/tomlin7/biscuit/releases)
   - For unstable nightly builds, check the [GitHub actions](https://github.com/tomlin7/biscuit/actions)

2. **Compiling from source**: 
   For instructions on compiling from source code, please refer to the [installation guide](https://github.com/tomlin7/biscuit/tree/main/scripts/README.md).
