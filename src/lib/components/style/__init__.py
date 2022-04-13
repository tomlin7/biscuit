import tkinter as tk
from tkinter import ttk


class Style(ttk.Style):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.style_editor_tabs()

    def style_editor_tabs(self):
        self.images = (
            tk.PhotoImage("img_closebtn", data='''
                iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7DAAA
                OwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAT
                RJREFUOI2tlUtuglAUhn8hdg12AcycERNuF1TbFTBwKYqJ7TZwYChN+tiEbKAxD
                kW/DsAG7eVh9Buew/04D3KRSoA74BlIgS3tbIE34AnoqwpwD3x3kNTxBQyqlV0j
                O/IJ9EXR5q0Y94B3SUa3IXUkDW2ZLMtqTzXkhrLVHccxxhiSJPmXi6KIIAhYr9f
                Wnq3C/X7PZDIhCAJWq9VffLFY4Ps+s9msdohWoU3aRdYorEpHo1EnGYDTtDLHce
                R5ng6Hg1zXled57Xtuetuxzel0ap3pRS2fz6xuUZ2EcRzj+z7z+fwknuc5YRhij
                Gn8bDbnwd1ux3K5tB7I87w2B/z0gFTSQ/u0O5E6kl5vJJOkFwF9ivvsWj44XrTA
                gOI+u0Y2OKm1rHQMJFgWZWFTPvtI5RfwC7IYP8M6S0UlAAAAAElFTkSuQmCC
                '''),
            tk.PhotoImage("img_closebtnhover", data='''
                iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7DAAA
                OwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAc
                BJREFUOI2tlb9q21AUxn9XpFlspZMHPYMiYai6tJPBBtsQOts0HtLX8SuECKVvU
                BkvBglDOjReKrj4FYrlIS3VZKzTxU7zR4pb7G/8Dt+Pez4uHMVGWuvjNE0/AR8B
                F6jysn4rpb7nef7ZNM1Lz/NWAApgOp1aIvJFRN7sgJRpJiJnjUbjh9JaHy+Xy69
                7wLa6rVar7482a+4LA3ibZdmFAZwfALbVuQGcFk3SNC1Nlc1E5NQAzKeDJEkYDo
                fM5/NnoclkwnA4LIO+Nopcx3FwXRff99Fa3/tRFDEej2m1WtRqtcJXHhWZSin6/
                T4AQRAwGAxYLBaEYUin06HZbBbCSoFPob7vk+f5ThhA4coPoZZlkec5hmFgWdaL
                sJ3AKIoYjUa0223q9TpBEDzqtEilK0dR9KgzEQH+dmrb9r+/MEkSwjCk2+3ed6a
                UotfrYds2QRCU/kUVx/FP4OShuV6v0Vrjuu6zQJ7naK1xHKeId6fiOL4B3pVs/l
                9SSt0YInJ9CNhGgWGa5iUwOwDsW6VSuTI8z1uJyBlwuw9MRD54nrdSW2c2m73Ks
                uxCRLYn4KQ8D8AvIFFKXVcqlavtCfgDSfW955Jl41YAAAAASUVORK5CYII=
                ''')
        )

        self.element_create("close", "image", "img_closebtn",
                            ("active", "!disabled", "img_closebtnhover"), 
                            border=19, sticky='')
        self.layout("EditorTabs", [
                ("EditorTabs.client", {
                    "sticky": "nswe"
                })
            ])
        self.layout("EditorTabs.Tab", [
            ("EditorTabs.tab", {
                "sticky": "nswe",
                "children": [
                    ("EditorTabs.padding", {
                        "side": "top",
                        "sticky": "nswe",
                        "children": [
                            ("EditorTabs.label", {"side": "left", "sticky": ''}),
                            ("EditorTabs.close", {"side": "left", "sticky": ''}),
                        ]
                    })
                ]
            })
        ])
