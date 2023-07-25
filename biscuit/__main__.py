"""
Entry point for the main app.
To run the app, do:

>>> python -m biscuit
"""

import platform, sys

# The splash screen (windows specific)
if platform.os == "Windows" and getattr(sys, 'frozen', False):
    import pyi_splash
    pyi_splash.update_text("Initializing...")
    pyi_splash.close()

from biscuit.app import App

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

app = App(sys.argv[0], dir=dir)
app.run()
