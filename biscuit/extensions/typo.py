import tkinter as tk
import random


class Extension:
    def __init__(self, api):
        self.api = api
        
    def run(self):
        class Typo(self.api.Game):
            name = "Typo"
            def __init__(self, master, *args, **kwargs):
                super().__init__(master, *args, **kwargs)
                self.config(**self.base.theme.editors)

                self.pos = 0
                self.dict = "LOREM IPSUM DOLOR SIT AMET cats and dogs are awesome".split()

                self.words = []
                self.text = ""
                self.time = 0
                self.done = False
                self.session = 0

                self.c = tk.Frame(self, **self.base.theme.editors)
                self.c.pack(fill='both', expand=True)

                r = tk.Menubutton(self.c, text='Randomize', **self.base.theme.editors.text, font=("Consolas", 20, 'bold'),relief='flat', padx=10, pady=10)
                r.pack(side='left')
                r.bind('<Button-1>', self.randomize)

                self.l = tk.Label(self.c, **self.base.theme.editors.text, font=("Consolas", 20, 'bold'),relief='flat', padx=10, pady=10)
                self.l.pack(side='right')

                self.m = tk.Label(self.c, **self.base.theme.editors.text, font=("Consolas", 20, 'bold'),relief='flat', padx=10, pady=10)
                self.m.pack(side='right')

                self.c2 = tk.Frame(self, **self.base.theme.editors)
                self.c2.pack(fill='both', expand=True)

                self.t = tk.Text(self.c2, width=50, **self.base.theme.editors.text, font=("Consolas", 20, 'bold'), relief='flat', insertbackground='white')
                self.t.insert('end', self.text)
                self.t.pack(fill=tk.BOTH, side='left', expand=True)
                self.t.tag_config('typed', foreground='green')
                self.t.bind('<Key>', self.check_key)
                self.t.focus_set()

                self.s_lb = tk.Label(self.c2, text="SESSION |\n------- +", padx=10, **self.base.theme.editors.text, font=("Consolas", 20, 'bold'), relief='flat')
                self.s_lb.pack(fill=tk.X, side='left', anchor='n')

                self.t_lb = tk.Label(self.c2, text="TIME\n----", **self.base.theme.editors.text, font=("Consolas", 20, 'bold'), relief='flat')
                self.t_lb.pack(fill=tk.X, anchor='n')

                self.randomize()
                
            def update_time(self, session):
                if session != self.session:
                    return
                
                if self.pos >= len(self.text):
                    self.m.config(fg="green")
                    self.s_lb.config(text=self.s_lb["text"] + f'\n{session}')
                    self.t_lb.config(text=self.t_lb["text"] + f'\n{self.time}')
                    return
                    
                self.time += 1
                self.m.config(text=f"{self.time}s")

                self.t.after(1000, self.update_time, session)

            def refresh(self):
                self.t.tag_remove('typed', '1.0', 'end')
                self.t.tag_add('typed', '1.0', f'1.{self.pos}')
                self.t.mark_set('insert', f'1.{self.pos}')

                self.l.config(text=f"{self.pos}/{len(self.text)}")

            def getchar(self, keysym):
                match keysym:
                    case 'space':
                        return ' '
                    case _:
                        return keysym

            def check_key(self, e):        
                if self.pos < len(self.text):
                    if self.getchar(e.keysym) == self.text[self.pos]:
                        self.pos += 1
                    else:
                        # TODO: wrong key pressed
                        pass
                    
                    self.refresh()
                
                return 'break'

            def randomize(self, *_):        
                self.words = [self.dict[random.randint(0, len(self.dict)-1)] for _ in range(0, len(self.dict))]
                self.text = " ".join(self.words)
                self.pos = 0
                
                self.t.delete('1.0', 'end')
                self.t.insert('end', self.text)
                self.t.mark_set('insert', '1.0')    
                self.m.config(fg="darkgrey")

                self.refresh()
                self.time = 0
                self.done = False
                self.session += 1
                self.update_time(self.session)

        self.api.register_game(Typo)
