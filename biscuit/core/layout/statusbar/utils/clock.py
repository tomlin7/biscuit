import time

from .button import SButton


class SClock(SButton):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.hour_24_format = True
        self.update()

    def update(self) -> None:
        time_live = time.strftime("%H:%M:%S" if self.hour_24_format else "%I:%M:%S")
        self.text_label.config(text=time_live) 
        self.after(200, self.update)

    def use_24_hour_format(self, flag: str) -> None:
        "Use 24 hour format for clock"
        self.hour_24_format = flag
        self.update()
