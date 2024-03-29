"""
Parts of the implementation is based on and are inspired by
Porcupine's LSP plugin https://github.com/Akuli/porcupine/
"""


from __future__ import annotations

import queue
import subprocess
import typing
from threading import Thread

if typing.TYPE_CHECKING:
    from biscuit.core import App


class IO:
    def __init__(self, master: App, cmd: str, cwd: str) -> None:
        """IO for LSP Client
        
        Attributes
        ----------
        master : LSPClient
            The LSPClient instance
        cmd : list
            The command to run the process
        """
        
        self.master = master
        self.base = master.base
        self.alive = True
        self.cmd = cmd
        self.cwd = cwd

        self.in_queue = queue.Queue() # input data
        self.out_queue = queue.Queue() # output results

    def write(self, buf) -> None:
        self.in_queue.put(buf)

    def read(self) -> None:
        buf = bytearray()
        while True:
            try:
                buf += self.out_queue.get(block=False)
            except queue.Empty:
                break

        if self.t_out.is_alive() and not buf:
            return None
        return bytes(buf)
        # return self.out_queue.get()

    def start(self, *_) -> None:
        "Start the process"
        self.p = subprocess.Popen(
            self.cmd, 
            stdout=subprocess.PIPE,
            stdin=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            shell=True)
        self.base.logger.info(f"PID: {self.p.pid} CMD: {self.cmd} CWD: {self.cwd}")

        Thread(target=self._process_in, daemon=True).start()
        self.t_out = Thread(target=self._process_out, daemon=True)
        self.t_out.start()

    def stop(self, *_) -> None:
        "Stop the process"
        self.alive = False
        self.p.kill()
        self.p.wait()

    def _process_in(self) -> None:
        while self.alive:
            try:
                chunk = self.in_queue.get(timeout=5)
            except queue.Empty:
                continue
            
            self.p.stdin.write(chunk)
            self.p.stdin.flush()
    
    def _process_out(self) -> None:
        while self.alive:
            data = self.p.stdout.read(1)
            if not data:
                break
            self.out_queue.put(data)
