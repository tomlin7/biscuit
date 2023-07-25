"""
Entry point for the main app.
To run the app, do:

>>> python -m biscuit
"""

import sys

# The splash screen (windows specific)
try:
    import pyi_splash
    pyi_splash.close()
except:
    pass

from biscuit.app import App

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

app = App(sys.argv[0], dir=dir)
app.run()
