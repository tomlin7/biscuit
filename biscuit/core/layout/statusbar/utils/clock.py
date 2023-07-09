import time

from .button import SButton

#TODO 12/24 actionset config
class SClock(SButton):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.update()
    
    def update(self):
        time_live = time.strftime("%I:%M %p")
        self.text_label.config(text=time_live) 
        self.after(200, self.update)
