import tkinter as tk

from notification import Notification

class Notifications(tk.Toplevel):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        # self.base = master.base

        self.wm_overrideredirect(True)
        self.wm_attributes("-topmost", True)
        self.wm_attributes("-transparentcolor", "white")
        self.config(bg='white')

        # self.geometry("+{}+{}".format(self.base.root.winfo_rootx(), self.base.root.winfo_rooty()))
        self._notifications = []

    # one basic notification model for now
    def add_notification(self, text):
        notif = Notification(self, text=text)
        notif.pack(fill=tk.X)
        self._notifications.append(notif)


if __name__ == "__main__":
    root = tk.Tk()

    n = Notifications(root)
    for i in range(10):
        n.add_notification("where are my cookies")

    root.mainloop()
