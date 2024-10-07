import tkinter as tk
import webbrowser

import mistune
from tkinterweb import HtmlFrame

from biscuit.common.icons import Icons
from biscuit.common.ui import Frame, Label, LinkLabel, Scrollbar
from biscuit.common.ui.buttons import IconLabelButton

from ..editor.editorbase import BaseEditor


class PRViewer(BaseEditor):
    """Pull Request Viewer

    Pull Request Viewer is a class that displays the details of a pull request in a GitHub repository.
    """

    def __init__(
        self,
        master,
        data: dict,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.filename = self.path = f"Pull request #{data['number']}"
        self.config(bg=self.base.theme.border)
        self.data = data

        label_cfg = {
            "bg": "#1C1C1C",
            "fg": self.base.theme.secondary_foreground,
            "font": (self.base.settings.uifont["family"], 12, "bold"),
        }

        container = Frame(self, width=150, padx=10, pady=10)

        # OPENED BY ------------------------------------------------------------

        Label(container, text="Opened by", **label_cfg).pack(
            side=tk.TOP, anchor=tk.W, pady=(20, 5)
        )
        LinkLabel(
            container,
            data["user"]["login"],
            lambda l=data["user"]["html_url"]: webbrowser.open(l),
        ).pack(side=tk.TOP, anchor=tk.W, pady=(0, 15)).config(bg="#1C1C1C")

        # ASSIGNEES ------------------------------------------------------------

        Label(container, text="Assignees", **label_cfg).pack(
            side=tk.TOP, anchor=tk.W, pady=5
        )
        for assignee in data["assignees"]:
            LinkLabel(
                container,
                assignee["login"],
                lambda l=assignee["html_url"]: webbrowser.open(l),
            ).pack(side=tk.TOP, anchor=tk.W).config(bg="#1C1C1C")

        # LABELS --------------------------------------------------------------

        Label(container, text="Labels", **label_cfg).pack(
            side=tk.TOP, anchor=tk.W, pady=(20, 5)
        )

        label_url = (
            "/".join(data["html_url"].split("/")[:-1]) + "?q=is%3Aissue+label%3A{}"
        )

        subcontainer = Frame(container)
        subcontainer.pack(side=tk.TOP, anchor=tk.W, pady=5)
        inline = 0
        for label in data["labels"]:
            if inline > 2:
                subcontainer = Frame(container)
                subcontainer.pack(side=tk.TOP, anchor=tk.W, pady=5)
                inline = 0

            # color = "#" + label["color"]
            IconLabelButton(
                subcontainer,
                label["name"],
                icon=Icons.TAG,
                callback=lambda l=label_url.format(label["name"]): webbrowser.open(l),
                # bg=color,
                # hbg=color,
            ).pack(side=tk.LEFT, padx=5)
            inline += 1

        # BODY --------------------------------------------------------------

        self.body = HtmlFrame(self, messages_enabled=False, vertical_scrollbar=False)
        self.scrollbar = Scrollbar(
            self,
            orient=tk.VERTICAL,
            command=self.body.yview,
            style="EditorScrollbar",
        )
        self.body.html.config(yscrollcommand=self.scrollbar.set)
        self.body.html.shrink(True)

        def load_new_page(url: str):
            webbrowser.open(url)

        self.body.on_link_click(load_new_page)

        self.body.load_html(
            f"<h1>{data['title']} <a href={data['html_url']}>#{data['number']}</a></h1>"
            + f"<span class='state-label'>{data['state']}</span>"
            + f"<a href={data['user']['html_url']}>{data['user']['login']}</a>"
            + f" wants to merge <code>{data['head']['label']}</code> into <code>{data['base']['label']}</code>"
            + "<br><hr>"
            + mistune.html(data["body"])
        )

        # TODO: load comments

        t = self.base.theme
        css = f"""
            img {{
                max-width: 100%;
                height: auto;
            }}

            
            hr {{
                border: 0;
                border-top: 1px solid {t.border};
                max-width: 100%;
            }}

            CODE, PRE {{
                font-family: {self.base.settings.font['family']};
                font-size: {self.base.settings.font['size']}pt;
                background-color: {t.border};
                padding: 2px;
            }}
            BODY {{
                background-color: {t.secondary_background};
                color: {t.secondary_foreground};
                padding: 10px;
                padding-left: 20px;
                padding-right: 20px;
            }}
            
            span.state-label {{
                display: inline-block;
                padding: 0.25em 0.5em;
                margin-right: 10px;
                font-size: 1.1em;
                font-weight: bold;
                color: white;
                background-color: {t.biscuit};
            }}

            li{{
                margin-left:1px;
            }}
            :link    {{ color: {t.biscuit}; }}
            :visited {{ color: {t.biscuit_dark}; }}
            INPUT, TEXTAREA, SELECT, BUTTON {{ 
                background-color: {t.secondary_background};
                color: {t.secondary_foreground_highlight};
            }}
            INPUT[type="submit"],INPUT[type="button"], INPUT[type="reset"], BUTTON {{
                background-color: {t.primary_background};
                color: {t.primary_foreground};
                color: tcl(::tkhtml::if_disabled {t.primary_background}{t.primary_foreground_highlight});
            }}
            """
        self.body.add_css(css)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=2)
        self.columnconfigure(3, weight=2)
        self.body.grid(row=0, column=1, sticky=tk.NSEW)
        self.scrollbar.grid(row=0, column=2, sticky=tk.NS, padx=(0, 1))
        container.grid(row=0, column=3, sticky=tk.NSEW)
