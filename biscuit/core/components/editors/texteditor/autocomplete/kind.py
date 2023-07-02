import tkinter as tk


class Kind(tk.Label):
    def __init__(self, master, kinds, kind="text", *args, **kwargs):
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base
        
        self.kinds = kinds
        self.kind = kind

        self.image = None

        self.config_appearance()
        self.config_image()

    def config_appearance(self):
        self.config(**self.base.theme.editors.autocomplete)
    
    def config_image(self):
        match self.kind:
            case "method":
                self.image = self.kinds.imethods
            case "variable":
                self.image = self.kinds.ivariables
            case "field":
                self.image = self.kinds.ifields
            case "class":
                self.image = self.kinds.iclasses
            case "interface":
                self.image = self.kinds.iinterfaces
            case "module":
                self.image = self.kinds.imodules
            case "property":
                self.image = self.kinds.iproperties
            case "keyword":
                self.image = self.kinds.ikeywords
            case _:
                self.image = self.kinds.iwords
        self.config(image=self.image)