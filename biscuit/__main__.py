"""
Entry point for the main app.
To run the app, do:

>>> python -m biscuit
"""

try:
    import pyi_splash
    pyi_splash.update_text("Initializing...")
    pyi_splash.close()
except:
    pass

import sys

from biscuit.app import App

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

app = App(sys.argv[0], dir=dir)
app.run()
