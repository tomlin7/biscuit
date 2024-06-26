# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files
from PyInstaller.utils.hooks import collect_all

datas = [
    ('../resources/*', 'resources/'), 
    ('../resources/fonts/*', 'resources/fonts/'), 
    ('../resources/bitmap/*', 'resources/bitmap/'),
    ('../resources/linux/*', 'resources/linux/'), 
]

binaries = []
hiddenimports = []
datas += collect_data_files('sv_ttk')
datas += collect_data_files('tkextrafont')
datas += collect_data_files('tkinterDnD')
tmp_ret = collect_all('tkinterweb')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['build.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='biscuit',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['../resources/windows/logo.png'],
)
