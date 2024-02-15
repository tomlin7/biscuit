## Building Biscuit

Biscuit can be built into standalone executable files using [pyinstaller](https://pyinstaller.org/).

To install pyinstaller run
```
pip install pyinstaller
```

### Building

Load the `windows.spec` or `linux.spec` file in pyinstaller with following command
```
pyinstaller scripts/windows.spec
```
This will generate build logs in `build/` and the distributable executable files in `dist/`.

The following direct command can be used to build too:
```
pyinstaller biscuit/__main__.py -n biscuit --clean --add-data "biscuit/res/*;res/" --collect-data sv_ttk --collect-data tkextrafont --collect-all pylsp --collect-all tkinterweb  -i scripts/logo.ico
```

> **Note**
> Make sure to run the commands from the project's root directory.
