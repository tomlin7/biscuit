import tkinter as tk
from tkinter import ttk

from biscuit.common.ui import Entry, Frame


class Item(Frame):
    def __init__(self, master, name="Example", callback=None, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)

        self.name = name
        self.callback = callback
        self.description = None  # TODO add descriptions

        self.bg, self.fg, self.highlightbg, _ = self.base.theme.editors.section.values()
        self.config(padx=10, pady=10, bg=self.bg)

        self.lbl = tk.Label(
            self,
            text=self.name,
            font=self.base.settings.uifont_bold,
            anchor=tk.W,
            bg=self.bg,
            fg=self.fg,
        )
        self.lbl.pack(fill=tk.X, expand=True)

    def change(self, *_) -> None:
        if self.callback:
            self.callback(self.value)


class DropdownItem(Item):
    def __init__(
        self,
        master,
        name="Example",
        options=["True", "False"],
        default=0,
        callback=None,
        *args,
        **kwargs
    ) -> None:
        super().__init__(master, name, callback, *args, **kwargs)

        if isinstance(default, str):
            try:
                default = options.index(default)
            except ValueError:
                default = 0

        self.var = tk.StringVar(self, value=options[default])
        self.var.trace_add("write", self.change)
        
        m = ttk.OptionMenu(self, self.var, options[default], *options)
        m.config(width=30)
        m.pack(side=tk.LEFT)

    @property
    def value(self) -> str:
        return self.var.get()


class IntegerItem(Item):
    def __init__(self, master, name="Example", default="0", callback=None, *args, **kwargs) -> None:
        super().__init__(master, name, callback, *args, **kwargs)
        self.base.register(self.validate)

        self.entry = ttk.Entry(
            self,
            font=self.base.settings.uifont,
            width=30,
            validate="key",
            validatecommand=(self.register(self.validate), "%P"),
        )
        self.entry.insert(0, str(default))
        self.entry.pack(side=tk.LEFT)
        self.entry.bind("<Return>", self.change)
        self.entry.bind("<FocusOut>", self.change)

    def validate(self, value) -> None:
        return bool(value.isdigit() or value == "")

    @property
    def value(self) -> str:
        return self.entry.get()


class PasswordItem(Item):
    def __init__(self, master, name="Example", default="", callback=None, *args, **kwargs) -> None:
        super().__init__(master, name, callback, *args, **kwargs)
        self.entry = ttk.Entry(self, font=self.base.settings.uifont, width=30, show="*")
        self.entry.insert(tk.END, default)
        self.entry.pack(side=tk.LEFT)
        self.entry.bind("<Return>", self.change)
        self.entry.bind("<FocusOut>", self.change)

    @property
    def value(self) -> str:
        return self.entry.get()


class StringItem(Item):
    def __init__(
        self, master, name="Example", default="placeholder", callback=None, *args, **kwargs
    ) -> None:
        super().__init__(master, name, callback, *args, **kwargs)

        self.entry = ttk.Entry(self, font=self.base.settings.uifont, width=30)
        self.entry.insert(tk.END, default)
        self.entry.pack(side=tk.LEFT)
        self.entry.bind("<Return>", self.change)
        self.entry.bind("<FocusOut>", self.change)

    @property
    def value(self) -> str:
        return self.entry.get()


class CheckboxItem(Item):
    def __init__(self, master, name="Example", default=True, callback=None, *args, **kwargs) -> None:
        super().__init__(master, name, callback, *args, **kwargs)

        self.var = tk.BooleanVar(self, value=default)
        self.var.trace_add("write", self.change)

        ttk.Checkbutton(self, text=name, variable=self.var, cursor="hand2").pack(
            fill=tk.X, anchor=tk.W
        )

    @property
    def value(self) -> str:
        return self.var.get()



class MCPServersItem(Item):
    def __init__(self, master, name="MCP Servers", callback=None, *args, **kwargs) -> None:
        super().__init__(master, name, callback, *args, **kwargs)
        self.lbl.pack_forget()

        self.rows: dict[str, dict] = {}
        self._add_mode = False

        self.container = Frame(self, bg=self.bg)
        self.container.pack(fill=tk.X, expand=True)

        self._render_servers()

        self.add_btn = tk.Button(
            self, text="+ Add MCP Server",
            command=self._show_add_form,
            bg=self.bg, fg=self.fg,
            cursor="hand2", relief=tk.FLAT,
            font=self.base.settings.uifont
        )
        self.add_btn.pack(anchor=tk.W, pady=(5, 0))

    def _server_data(self) -> dict:
        return self.base.config.get_nested("ai.mcp_servers", {})

    def _save_servers(self, servers: dict):
        self.base.config.set_nested("ai.mcp_servers", servers)

    def _render_servers(self):
        for w in self.container.winfo_children():
            w.destroy()
        self.rows.clear()

        servers = self._server_data()
        if not isinstance(servers, dict):
            servers = {}

        for name, cfg in servers.items():
            self._add_server_row(name, cfg)

    def _add_server_row(self, name: str, cfg: dict):
        if not isinstance(cfg, dict):
            cfg = {"command": str(cfg), "args": []}
        command = cfg.get("command", "")
        args = " ".join(cfg.get("args", []))
        env_items = cfg.get("env", {})

        row_frame = Frame(self.container, bg=self.highlightbg)
        row_frame.pack(fill=tk.X, pady=2)

        header = Frame(row_frame, bg=self.highlightbg)
        header.pack(fill=tk.X)

        label = tk.Label(header, text=name, font=self.base.settings.uifont_bold,
                         bg=self.highlightbg, fg=self.fg, anchor=tk.W)
        label.pack(side=tk.LEFT, padx=(5, 0))

        def delete_btn_cb(n=name):
            servers = self._server_data()
            servers.pop(n, None)
            self._save_servers(servers)
            self._render_servers()

        del_btn = tk.Button(header, text="✕", font=self.base.settings.uifont,
                            bg=self.highlightbg, fg="#e06c75", cursor="hand2",
                            relief=tk.FLAT, command=delete_btn_cb)
        del_btn.pack(side=tk.RIGHT, padx=5)

        def save_row(n=name, cmd_entry=None, args_entry=None, env_entry=None):
            def save():
                servers = self._server_data()
                cmd = cmd_entry.get().strip()
                raw_args = args_entry.get().strip()
                parsed_args = raw_args.split() if raw_args else []
                raw_env = env_entry.get().strip() if env_entry else ""
                parsed_env = {}
                for pair in raw_env.split(","):
                    pair = pair.strip()
                    if "=" in pair:
                        k, v = pair.split("=", 1)
                        parsed_env[k.strip()] = v.strip()

                if cmd:
                    servers[n] = {"command": cmd, "args": parsed_args}
                    if parsed_env:
                        servers[n]["env"] = parsed_env
                    self._save_servers(servers)
            return save

        cmd_frame = Frame(row_frame, bg=self.highlightbg)
        cmd_frame.pack(fill=tk.X, padx=5, pady=(2, 0))

        tk.Label(cmd_frame, text="Command:", bg=self.highlightbg, fg=self.fg,
                 font=self.base.settings.uifont, width=10, anchor=tk.W).pack(side=tk.LEFT)
        cmd_entry = tk.Entry(cmd_frame, bg=self.bg, fg=self.fg,
                             font=self.base.settings.uifont, relief=tk.FLAT)
        cmd_entry.insert(0, command)
        cmd_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        cmd_entry.bind("<FocusOut>", save_row(cmd_entry=cmd_entry))

        args_frame = Frame(row_frame, bg=self.highlightbg)
        args_frame.pack(fill=tk.X, padx=5, pady=(2, 0))

        tk.Label(args_frame, text="Args:", bg=self.highlightbg, fg=self.fg,
                 font=self.base.settings.uifont, width=10, anchor=tk.W).pack(side=tk.LEFT)
        args_entry = tk.Entry(args_frame, bg=self.bg, fg=self.fg,
                              font=self.base.settings.uifont, relief=tk.FLAT)
        args_entry.insert(0, args)
        args_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        args_entry.bind("<FocusOut>", save_row(args_entry=args_entry))

        if env_items:
            env_frame = Frame(row_frame, bg=self.highlightbg)
            env_frame.pack(fill=tk.X, padx=5, pady=(2, 0))
            tk.Label(env_frame, text="Env:", bg=self.highlightbg, fg=self.fg,
                     font=self.base.settings.uifont, width=10, anchor=tk.W).pack(side=tk.LEFT)
            env_entry = tk.Entry(env_frame, bg=self.bg, fg=self.fg,
                                 font=self.base.settings.uifont, relief=tk.FLAT)
            env_str = ",".join(f"{k}={v}" for k, v in env_items.items())
            env_entry.insert(0, env_str)
            env_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
            env_entry.bind("<FocusOut>", save_row(env_entry=env_entry))

    def _show_add_form(self):
        if self._add_mode:
            return
        self._add_mode = True

        form = Frame(self, bg=self.highlightbg)
        form.pack(fill=tk.X, pady=2, before=self.add_btn)
        self.add_btn.pack_forget()

        fields = {}
        for label_text, key in [("Name", "name"), ("Command", "command"), ("Args", "args")]:
            row = Frame(form, bg=self.highlightbg)
            row.pack(fill=tk.X, padx=5, pady=2)
            tk.Label(row, text=label_text+":", bg=self.highlightbg, fg=self.fg,
                     font=self.base.settings.uifont, width=10, anchor=tk.W).pack(side=tk.LEFT)
            e = tk.Entry(row, bg=self.bg, fg=self.fg,
                         font=self.base.settings.uifont, relief=tk.FLAT)
            e.pack(side=tk.LEFT, fill=tk.X, expand=True)
            fields[key] = e

        def confirm():
            name = fields["name"].get().strip()
            cmd = fields["command"].get().strip()
            raw_args = fields["args"].get().strip()
            if not name or not cmd:
                return
            servers = self._server_data()
            parsed_args = raw_args.split() if raw_args else []
            servers[name] = {"command": cmd, "args": parsed_args}
            self._save_servers(servers)
            self._add_mode = False
            form.destroy()
            self._render_servers()
            self.add_btn.pack(anchor=tk.W, pady=(5, 0))

        def cancel():
            self._add_mode = False
            form.destroy()
            self.add_btn.pack(anchor=tk.W, pady=(5, 0))

        btn_row = Frame(form, bg=self.highlightbg)
        btn_row.pack(fill=tk.X, padx=5, pady=(5, 5))
        tk.Button(btn_row, text="Cancel", command=cancel,
                  bg=self.bg, fg=self.fg, cursor="hand2",
                  relief=tk.FLAT, font=self.base.settings.uifont).pack(side=tk.RIGHT, padx=2)
        tk.Button(btn_row, text="Add", command=confirm,
                  bg=self.bg, fg=self.fg, cursor="hand2",
                  relief=tk.FLAT, font=self.base.settings.uifont).pack(side=tk.RIGHT, padx=2)


# TODO list item with add to list button for taking list values
