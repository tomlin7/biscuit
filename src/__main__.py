import sys
from lib import root

dir = None
if len(sys.argv) >= 2:
    dir = sys.argv[1]

root = root.Root(dir=dir)
root.run()