import tkinter as tk
from tkinter import ttk
from tkinter import font


class Style(ttk.Style):
    def __init__(self, master, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master

        self.config_editor_tabs()
        self.config_treeview()
        self.config_tree_scrollbar()
    
    def config_tree_scrollbar(self):
        self.element_create("TreeScrollbar.trough", "from", "clam")
        self.element_create("TreeScrollbar.thumb", "from", "clam")

        self.layout("TreeScrollbar", [
            ('TreeScrollbar.trough', {
                'sticky': 'ns',
                'children': [
                    ('TreeScrollbar.thumb', {
                        'unit': '1', 
                        # 'children': [
                        #     ('TreeScrollbar.grip', {
                        #         'sticky': ''
                        #     })
                        # ],
                        'sticky': 'nswe'
                    })
                ]
            })
        ])

        self.configure("TreeScrollbar", gripcount=0, bd=0, background="#bababa", bordercolor='#f3f3f3', troughcolor='#f3f3f3', lightcolor='#f3f3f3', darkcolor='#f3f3f3', arrowsize=14)
        self.map("TreeScrollbar", background=[('pressed', '#616161'), ('!disabled', '#bababa')])

    def config_treeview(self):
        self.img_tree_close = tk.PhotoImage("img_tree_close", data="""
                iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d
                2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAALBJREFUGJVjYIACExMTfxMTk8WhoaHMDDgAE4zx69ev4////ze4d+
                /ecgcHBxZsihmROXp6emKsrKx7GRgYrvPy8kYdOHDgD07FhDQwoSu+dOnSq9+/fzszMDBofv78eY2npyc7TsUwDez
                s7JEMDAweL1++XAgTx+oRPT09sZ8/fy5nZGTcLiYmFk+Mm6/x8vJGI7sZV2hgKERRTEghigfZ2NgsGRkZLygpKWGE
                LwwAAECxSWJ5KCTqAAAAAElFTkSuQmCC""")
        self.img_tree_open = tk.PhotoImage("img_tree_open", data="""
                iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d
                2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAALxJREFUGJW10D0KwkAQBeA3wd2EiJ23ELbZYJMTKGJhIZ7G81irCB
                4g5TaBNJ7Bzh92Y/GsItsogvjK4Zs3MMC/IkVRjNu2beq6vr1Dxpi+1nqUkFxrrQ/GmP4HeCC5TgAsATyUUseyLAc
                xtNbmSqkdSfHer6QbisiWZJZl2aSqqou1NgewB9Dz3k+bprlK3NItpGm6CCFsYggASYedc3eScxF5hBBOIpLGEABe
                zdGFIcm9iMycc+cvv/pjnkvzViGP6ap9AAAAAElFTkSuQmCC""")
        self.img_tree_empty = tk.PhotoImage("img_tree_empty", data="""
                iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d
                2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAA5JREFUGJVjYBgFIwgAAAHvAAGLZFZqAAAAAElFTkSuQmCC""")

        self.element_create(
            'Treeitem.nindicator', 'image',  self.img_tree_close,
            ('user1', '!user2', self.img_tree_open), ('user2', self.img_tree_empty), 
            sticky='w', width=15)
        
        self.configure("Treeview", foreground="#616161", background="#f3f3f3", font=("Segoe UI", 10), rowheight=23)
        self.layout('Treeview', [('Treeview.treearea', {'sticky': 'nswe'})])
        self.layout('Treeview.Item', [
            ('Treeitem.padding', {
                'sticky': 'nswe',
                'children': [
                    ('Treeitem.nindicator', {
                        'side': 'left', 'sticky': ''
                    }),
                    ('Treeitem.image', {
                        'side': 'left', 'sticky': ''
                    }),
                    
                    # dashed line representing focus
                    # ('Treeitem.focus', {
                    #     'side': 'left', 'sticky': '',
                    #     'children': [
                            ('Treeitem.text', {
                                'side': 'left', 'sticky': ''
                            })
                    #     ]
                    # }),
                ]
            })
        ])

    def config_editor_tabs(self):
        self.img_tabs_close = tk.PhotoImage("img_tabs_close", data="""
                iVBORw0KGgoAAAANSUhEUgAAABcAAAAXCAYAAADgKtSgAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d
                2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAQtJREFUSIntkbFKxEAURc9MQIRtbPMDNoEhOAkWtrJa2PgpwjbarG
                yxFpZ+jbKWViEQUirWaRdBkIXk2WQlBCaOa5vTXt55j3dhZMSXYChMkuQ2DMOPqqqqXXLtEhtjJiJyAaystUf93Fp
                7LyJz4MTlcMrLsvys6/oUeAOe0zRNO+IlMANu8jx/cDmUK9gSx/FBEASPwKHWeto0zSVw3YrvhmZ/lXcXKKWMiOz7
                iGHgLV2KoliLyEsr/tJar3zmvOTW2qVS6gpYAGXTNE/dDnaWt+Vtfzyv6/oMePVZMPjznvjnx/2SsyzL/nS5MWYCT
                IFZv7yiKNabzeYceBeR46EDnURRtPeffGTEn2/cN3AwnRKrMwAAAABJRU5ErkJggg==""")
        self.img_tabs_close_hover = tk.PhotoImage("img_tabs_close_hover", data="""
                iVBORw0KGgoAAAANSUhEUgAAABcAAAAXCAYAAADgKtSgAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d
                2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAdpJREFUSIm1lb+KGlEUxn/3jojFtF5XK3s72ywJeQFbsZApIoG47A
                s4djqvYEg2FlNMYSG+QSAxWFjYKYIWVv6Z2kKMm5tiVTaJo8Nivva753fgfOdyBM+0WCzeSik/AK+AG0ByWb+Apdb
                6h2EYjXg8/u1gCIDhcBiNx+MNrfW7ELBLelBK3QkhfgoA3/e/XAl8bJBIJN6L/Si+XhEMgBDijZRSlq8N3qsseQrv
                6tJa30pABT3wPI/pdBoIuODfSMA45Ww2G/r9PrZtnwQ0m008z2M0GgXBjcA9jsViOI5DMpmkUqkwmUyOnuu6tNttL
                Msil8sFIRCr1UoHusB6vaZarTKfz3Ech16vR6vVwrIs8vn8udLL8OcNZrMZ2+02FBjCfW9M0ySTybDdbolGo2Sz2T
                Bl4eCu69LpdCgUCqTTaWzb/iODF8Nd1z3OuFgsUq/XSaVSoRqchT8HH2ZsmmboBoHwzWbDYDCgVCr9E55pmtRqNZL
                JJOPxOBAuVqvVjoCPtNvtiEQigcUX/EcJ+EHuOXAIfym11t2zhJfruzQMo/E/yEKIj3J/8x6uzP6klOpKAKXUHfD5
                iuB72B/og3zffw2Utda3PF3/k1v0lx6BpRCiCzSUUscMfwOrTsBBKbnh3wAAAABJRU5ErkJggg==""")

        self.element_create("close", "image", self.img_tabs_close,
                            ("active", "!disabled", self.img_tabs_close_hover), 
                            border=16, sticky='')
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
