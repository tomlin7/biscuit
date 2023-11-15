import sys

# splash screen (windows specific)
try:
    import pyi_splash
    pyi_splash.close()
except:
    pass

from biscuit.core import App

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

app = App(sys.argv[0], dir=dir)
app.run()
