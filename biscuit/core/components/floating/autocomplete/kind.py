from __future__ import annotations

import typing

if typing.TYPE_CHECKING:
    from .item import CompletionItem
    from biscuit.core.components.floating.autocomplete.kinds import Kinds

from biscuit.core.components.utils import Label


class Kind(Label):
    def __init__(self, master: CompletionItem, kinds: Kinds, kind: str="text", *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.master = master
        self.base = master.base

        self.kinds = kinds
        self.kind = kind

        self.image = None

        self.config(**self.base.theme.editors.autocomplete)
        self.config_image()

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
