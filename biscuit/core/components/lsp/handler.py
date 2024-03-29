from __future__ import annotations

import pprint
import re
import typing

import tarts as lsp

from .data import *
from .utils import *

if typing.TYPE_CHECKING:
    from .client import LangServerClient

class EventHandler:
    def __init__(self, master: LangServerClient):
        self.master = master
        self.client = master.client
        self.base = master.base

    def process(self, e: lsp.Event) -> None:
        if isinstance(e, lsp.Shutdown):
            self.client.exit()
            return
        
        if isinstance(e, lsp.LogMessage):
            self.base.logger.rawlog(e.message, e.type)
            return
    
        if isinstance(e, lsp.ShowMessage):
            self.base.notifications.notify(e.message, e.type)
            return
        
        if isinstance(e, lsp.Initialized):
            self.base.logger.info("Capabilities " + pprint.pformat(e.capabilities))
            for tab in self.master.tabs_opened:
                self.master.open_tab(tab)
                self.master.request_outline(tab)

            self.base.statusbar.process_indicator.hide()
            return
        
        if isinstance(e, lsp.Completion):
            tab, req = self.master._autocomplete_req.pop(e.message_id)
            if tab not in self.master.tabs_opened:
                return

            before_cursor = tab.get(f"{req.cursor} linestart", req.cursor)
            match = re.fullmatch(r".*?(\w*)", before_cursor)
            prefix_len = len(match.group(1))
            tab.lsp_show_autocomplete(
                Completions(
                    id=req.id,
                    completions=[
                        Completion(
                            kind=item.kind,
                            display_text=item.label,
                            replace_start=tab.index(f"{req.cursor} - {prefix_len} chars"),
                            replace_end=req.cursor,
                            replace_text=item.insertText or item.label,
                            filter_text=(item.filterText or item.insertText or item.label)[prefix_len:],
                            documentation=get_completion_item_doc(item),
                        )
                        for item in sorted(
                            e.completion_list.items,
                            key=(lambda item: item.sortText or item.label),
                        )
                    ],
                ),
            )
            return
        
        if isinstance(e, lsp.PublishDiagnostics):
            matching_tabs = [
                tab
                for tab in self.master.tabs_opened
                if tab.path is not None and Path(tab.path).as_uri() == e.uri
            ]
            if not matching_tabs:
                return
            tab = matching_tabs[0]

            tab.lsp_diagnostics(
                Underlines(
                    id="diagnostics",
                    underline_list=[
                        Underline(
                            start=decode_position(diagnostic.range.start),
                            end=decode_position(diagnostic.range.end),
                            tooltip_text=f"{diagnostic.source}: {diagnostic.message}",
                            color=(
                                "red"
                                if diagnostic.severity == lsp.DiagnosticSeverity.ERROR
                                else "orange"
                            ),
                        )
                        for diagnostic in sorted(
                            e.diagnostics,
                            key=(lambda d: d.severity or lsp.DiagnosticSeverity.WARNING),
                            reverse=True,
                        )
                    ],
                ),
            )
            return
        
        if isinstance(e, lsp.Definition):
            tab, pos = self.master._gotodef_requests.pop(e.message_id)

            tab.lsp_goto_definition(
                Jump(
                    pos=pos,
                    locations=[
                        JumpLocationRange(
                            file_path=str(path),
                            start=decode_position(range.start),
                            end=decode_position(range.end),
                        )
                        for path, range in jump_paths_and_ranges(e.result)
                    ]
                ),
            )
            return
        
        if isinstance(e, lsp.WorkspaceEdit):
            tab = self.master._rename_requests.pop(e.message_id)
            if not e.documentChanges:
                return
            
            tab.lsp_rename(
                WorkspaceEdits([
                    WorkspaceEdit(
                        file_path=decode_path_uri(i.textDocument.uri), 
                        edits=[
                            TextEdit(
                                start=decode_position(j.range.start),
                                end=decode_position(j.range.end),
                                new_text=j.newText
                            )
                            for j in i.edits
                        ]
                    ) 
                    for i in e.documentChanges
                ]))

        if isinstance(e, lsp.Hover):
            requesting_tab, location = self.master._hover_requests.pop(e.message_id)
            requesting_tab.lsp_hover(HoverResponse(location, *hover_filter(e.contents)))
            return
        
        if isinstance(e, lsp.MDocumentSymbols):
            tab = self.master._outline_requests.pop(e.message_id)
            if tab not in self.master.tabs_opened:
                return

            self.base.language_server_manager._update_symbols(tab, e.result)
            self.base.outline.update_symbols(tab, e.result if e.result and isinstance(e.result[0], lsp.DocumentSymbol) else to_document_symbol(e.result))
            return
        
        # DEBUG ones that are not implemented yet
        self.base.logger.trace(e.__class__.__name__.upper())
        # print(e)
