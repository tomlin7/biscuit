from lib import base
from lib import root

# Debug
def size(event):
    print(f"{event.widget.winfo_width()}x{event.widget.winfo_height()}")

# ----

root = root.Root()
root.minsize(1290, 800)

# root.bind("<Configure>", size)

root.run()