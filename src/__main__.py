import sys

from .biscuit import App, check_python_installation

check_python_installation()

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

app = App(sys.argv[0], dir=dir)
app.run()

