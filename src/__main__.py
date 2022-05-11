import sys
from core import Root

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

root = Root(dir=dir)
root.run()
