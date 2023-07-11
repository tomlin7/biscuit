import tkinter as tk
from tkinter import ttk


class Style(ttk.Style):
    def __init__(self, master, theme, *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        self.theme = theme
        
        self.configure("TCheckbutton", background=self.theme.editors.background)
        self.gen_fileicons()
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
                        'sticky': 'nsew'
                    })
                ]
            })
        ])

        
        bg, _, highlight, _ = self.theme.utils.scrollbar.values()
        self.configure("TreeScrollbar", gripcount=0, background=bg, troughcolor=bg, bordercolor=bg, lightcolor=bg, darkcolor=bg, arrowsize=14)
        self.map("TreeScrollbar", background=[('pressed', highlight), ('!disabled', self.theme.border)])

        bg, _, highlight, _ = self.theme.editors.values()
        self.layout('Vertical.TScrollbar', [
            ('Vertical.TScrollbar.trough', {
                'sticky': 'nsew',
                'children': [
                    ('Vertical.TScrollbar.thumb', {
                        'sticky': 'nsew'
                    })
                ]
            })
            
        ])
        self.configure("Vertical.TScrollbar", gripcount=0, background=bg, troughcolor=bg, bordercolor=bg, lightcolor=bg, darkcolor=bg)
        self.map("Vertical.TScrollbar", background=[('pressed', highlight), ('!disabled', self.theme.border)])

    def config_treeview(self):
        ## TREENODE CHEVRONS -----
        if self.base.testing:
            return
        
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

        self.configure("Treeview", font=("Segoe UI", 10), rowheight=23, **self.theme.utils.tree.item)  
        self.map("Treeview", background=[('selected', self.theme.utils.tree.item.selectedbackground)])

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
                    ('Treeitem.text', {
                        'side': 'left', 'sticky': ''
                    })
                ]
            })
        ])
    
    def gen_fileicons(self):
        self.document_icn = tk.PhotoImage("document", data="""
        iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAJ2AAACdgBx6C5rQA
        AABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADlSURBVDiNpZGxTgJBFEXPW9aGCRTYWht+wyVEEuq1md
        7Exm/A2NjxFUvBD1CQ7JZWlOhXQCNsoYnPajZk3Zks4VaTmfvOO8nAhRF3SJfa2X2XLwi39ZIi74XtzoOA0eIwUZVVQ+cDu
        AHmuTWz+mNUbdGo57HcKiTAc5KVb15AKIU1G4Ux6GMd0grgICIyBX26yw737j5uMZsm2VEBVBUAIeqfbeDLP4PcGmkqujgb
        LyDJjsuLDAJJWwFyax6ainV1L8BX9KX6BZHfr7ZDp93KYBCb9f6nfFUYhoZV+by+MutzLIP5A16TRi/mS3m5AAAAAElFTkS
        uQmCC
        """)

        self.folder_icn = tk.PhotoImage("foldericon", data="""
        iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAYAAABr5z2BAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB
        3d3cuaW5rc2NhcGUub3Jnm+48GgAAAJBJREFUKJHdzTEKwkAUhOF/loCFRbAVr+IhLAWLCPaW3sFGPIOm1Bt4hxSSEwRs7Z
        UdayErmnROO++bp93htJK0BUa8pxEq1ovZhQ/R/ni+G/LWEjW2y4Stx4NnmUU7l9R6YTxBbFLfb49sGlL4m9ieh84aAA17D
        sCfDLiHdwDqrlpwDTHGAqiA+IONQIW0fAFkySdEGFdeCgAAAABJRU5ErkJggg==""")