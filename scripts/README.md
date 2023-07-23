## Building Biscuit

Biscuit can be built into standalone executable files using [pyinstaller](https://pyinstaller.org/).

To install pyinstaller run
```
pip install pyinstaller
```

### Building for Windows

Load the `windows.spec` file in pyinstaller with following command
```
pyinstaller scripts/windows.spec
```
This will generate build logs in `build/` and the distributable executable files in `dist/`.

The following direct command can be used to build too:
```
pyinstaller biscuit/__main__.py -n biscuit -F --clean --add-data "biscuit/res/*;res/" --collect-data sv_ttk --collect-data tkextrafont --splash scripts/splash.png -i scripts/logo.ico
```

> **Note**
> Make sure to run the commands from the project's root directory.

### Building for Linux (experimental)

Load the `linux.spec` file in pyinstaller with following command
```
pyinstaller scripts/linux.spec
```
This will generate build logs in `build/` and the distributable executable files in `dist/`.

The following direct command can be used to build too:
```
pyinstaller biscuit/__main__.py -n biscuit -F --clean --add-data "biscuit/res/*:res/" --collect-data sv_ttk --collect-data tkextrafont
```
