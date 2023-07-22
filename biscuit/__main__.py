"""
Entry point for the main app.
To run the app, do:

>>> python biscuit
"""

import sys

from app import App

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

app = App(dir=dir)
app.run()