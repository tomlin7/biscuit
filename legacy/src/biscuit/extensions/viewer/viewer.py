from __future__ import annotations

import tkinter as tk
import typing
import urllib.request
import webbrowser

import mistune
from tkinterweb import HtmlFrame

from biscuit.common.icons import Icons
from biscuit.common.ui import Button, Frame, Label, Scrollbar, WebLinkLabel
from biscuit.common.ui.native import Toplevel

if typing.TYPE_CHECKING:
    from biscuit.views.extensions.extension import ExtensionGUI


class ExtensionViewer(Toplevel):
    """Extension Viewer

    Extension Viewer displays the details of an extension.
    """

    def __init__(
        self,
        master,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.ext: ExtensionGUI = None
        self.withdraw()
        self.config(bg=self.base.theme.border, padx=1, pady=1)
        self.overrideredirect(True)

        # container that holds the basic information (name, author, description, etc.)
        container = Frame(self, padx=10, pady=10)
        title = Frame(container)

        self.name = Label(title, text="Extension", fg=self.base.theme.biscuit)
        self.name.config(font=(self.base.settings.font["family"], 16, "bold"))
        self.version = Label(title, text="v1.0.0", fg=self.base.theme.border)
        self.version.config(font=(self.base.settings.font["family"], 10, "bold"))

        self.link = WebLinkLabel(
            title, text="Source Code", fg=self.base.theme.primary_foreground
        )
        self.link.config(font=self.base.settings.uifont)

        self.install = Button(
            title,
            "Install",
            padx=10,
        )
        self.install.config(font=("Segoi UI", 10), pady=2)

        title.pack(side=tk.TOP, fill=tk.X, pady=10)
        self.name.pack(side=tk.LEFT, fill=tk.X, padx=(0, 5))
        self.version.pack(side=tk.LEFT, fill=tk.X)
        self.install.pack(side=tk.RIGHT, fill=tk.X)
        self.link.pack(side=tk.RIGHT, fill=tk.X, padx=(0, 5))

        Label(container, text="…" * 100, fg=self.base.theme.border).pack(
            side=tk.TOP, fill=tk.X, pady=5
        )

        self.author = WebLinkLabel(
            container, text=f"Tommy", fg=self.base.theme.primary_foreground
        )
        self.author.config(font=self.base.settings.uifont)
        self.description = Label(
            container, text=f"Hello, world!", fg=self.base.theme.primary_foreground
        )
        self.description.config(font=self.base.settings.uifont)

        self.author.pack(side=tk.TOP, anchor=tk.W, pady=5)
        self.description.pack(side=tk.TOP, anchor=tk.W, pady=5)

        # pack the container at the top so that we can place the README preview just below it
        container.pack(
            side=tk.TOP, fill=tk.X, expand=False, pady=(0, 5), padx=(0, 5)
        )

        # ------------------------------------------------------------------
        # README viewer (markdown -> html)
        # ------------------------------------------------------------------
        self.body = HtmlFrame(container, messages_enabled=False, vertical_scrollbar=False)
        self.scrollbar = Scrollbar(
            container,
            orient=tk.VERTICAL,
            command=self.body.yview,
            style="EditorScrollbar",
        )

        self.body.html.config(yscrollcommand=self.scrollbar.set)

        self.body.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.bind("<Escape>", lambda _: self.hide())
        self.bind("<FocusOut>", lambda _: self.hide())

    def show(self, ext: ExtensionGUI) -> None:
        self.ext = ext
        self.name.config(text=ext.display_name)
        self.version.config(text=f"v{ext.version}")
        self.author.config(text=f"by @{ext.author}")
        self.description.config(text=ext.description)

        if ext.installed:
            self.install.config(text="Installed", bg=self.base.theme.biscuit_dark)
            self.install.set_command(ext.uninstall_extension)
        else:
            self.install.config(text="Install", bg=self.base.theme.biscuit)
            self.install.set_command(ext.install_extension)

        # load README (if available)
        readme_html = "<i>No README available for this extension.</i>"
        try:
            owner = repo = None
            url = getattr(ext.submodule_repo, "url", "") or ""
            try:
                if url.endswith(".git"):
                    url = url[:-4]

                if url.startswith("https://github.com/"):
                    owner, repo = url.split("https://github.com/")[1].split("/", 1)
                elif url.startswith("git@github.com:"):
                    owner, repo = url.split("git@github.com:")[1].split("/", 1)

                if owner and repo:
                    repo = repo.split("/")[0]
            except Exception:
                owner = repo = None

            if owner and repo:
                self.author.set_link(
                    f"https://github.com/{owner}/{repo}"
                )
                self.link.set_link(
                    f"https://github.com/{owner}/{repo}"
                )

                for branch in ("main", "master"):
                    remote_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md"
                    try:
                        with urllib.request.urlopen(remote_url, timeout=5) as resp:
                            remote_md = resp.read().decode()
                            readme_html = mistune.html(remote_md)
                            break
                    except Exception:
                        # continue to next branch fallback
                        continue
            else:
                if self.base.logger:
                    self.base.logger.warning(
                        f"Could not parse GitHub URL for extension {ext.id}: {url}"
                    )

            # still no luck? keep default message
        except Exception as e:
            if self.base.logger:
                self.base.logger.error(f"Failed to load README for {ext.id}: {e}")

        t = self.base.theme
        css = f"""
            body {{
                background-color: {t.primary_background};
                color: {t.primary_foreground};
                padding: 10px;
            }}
            img {{
                max-width: 100%;
                height: auto;
            }}
            code, pre {{
                background-color: {t.border};
                font-family: {self.base.settings.font['family']};
                font-size: {self.base.settings.font['size']}pt;
                padding: 2px;
            }}
            :link    {{ color: {t.biscuit}; }}
            :visited {{ color: {t.biscuit_dark}; }}
            hr {{
                border: 0;
                border-top: 1px solid {t.border};
            }}
        """

        self.body.load_html(readme_html)
        self.body.add_css(css)

        self.deiconify()
        self.focus_set()

        self.geometry(
            f"700x500+{self.winfo_screenwidth() // 2 - 350}+{self.winfo_screenheight() // 2 - 250}"
        )

    def hide(self) -> None:
        self.withdraw()
        self.ext = None
