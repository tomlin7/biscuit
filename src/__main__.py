import sys
from core import root

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

root = root.Root(path=sys.argv[0], dir=dir)
root.run()
