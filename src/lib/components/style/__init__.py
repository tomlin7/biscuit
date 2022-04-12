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
                iVBORw0KGgoAAAANSUhEUgAAAB4AAAAlCAYAAABVjVnMAAAAAXNSR0IArs4
                c6QAAAT9JREFUWEftkrtOhEAUhpkwdhYWEONivMTCGOBAwuPY+RL7DPsSdj
                4OCRyYGAvjJYIxUFjYOWTMbLUxW8yBrFgMzTDJ+f8v880wZ6aPzcR1LPjPz
                FvVVvXODNjHtTO1v4v/v2rf92+CIFgVReFv05Kmadc0zbLrulsTbaQTh2FY
                c879siwPN8uTJPmQUnZCiMgEqmdIYB2Ioujedd2DsiyP9D5JkvdhGD7rur4
                yhY4C61AYhg+c8339L6X8EkJcUqCjwTqYZZnUa57nnAodDQaAF6XUsC5gzE
                XEUyqcfMcA8KR5iHimYQDw7DiOQsRzCpwEjuP4kTG2h4gnmxAAeFVKfVdVd
                WEKNwZ7nne9WCxWiHi8rRwA3tq2XfZ9f2cCNwablFFmLJhia9KsVT1JHyVs
                VVNsTZq1qifpo4RnU/0DhPBZJmDBDSEAAAAASUVORK5CYII=
                '''),
            tk.PhotoImage("img_closebtnhover", data='''
                iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAAAXNSR0IArs4c6QA
                AAPJJREFUSEtjZBggwDhA9jKMWsxgbm5u4+PjE0LNKNi/f/+2ffv27UI2EyOoEx
                MTMzs6OqZR0+LOzs66vr6+5lGLUUJ1NKhhwfH//3+GGzduMGhqamJNd9evX2fQ0
                NBgYGTELBooSlwgg4uLixl6enoYtLS0UCy/du0aQ0lJCUNvby9Wh1FkMcgmmAXI
                lmMTQw8Sii1GtxzEB/kUWyggW04Vi5EtB7EJWQpSM7QtRo5TugX1gCSuActOA1a
                AUFJNUi1Vk+qIUYtBITZ4mj62trbOERERCaTGIz71W7ZsWbt9+/YNeNtc1LQQn1
                mjDXp6hTQDAPpaEC5rdvpRAAAAAElFTkSuQmCC
                ''')
        )

        self.element_create("close", "image", "img_closebtn",
                            ("active", "!disabled", "img_closebtnhover"), 
                            border=22, sticky='')
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
