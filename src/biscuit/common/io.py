from __future__ import annotations

import queue
import subprocess
import typing
from threading import Thread

if typing.TYPE_CHECKING:
    from biscuit import App


class IO:
    """Handling input/output of a process in a separate thread"""

    def __init__(self, master, cmd: str, cwd: str) -> None:
        """Initialize the IO class

        Args:
            master: The parent object
            cmd (str): The command to run
            cwd (str): The working directory"""

        self.master = master
        self.base: App = master.base
        self.alive = True
        self.cmd = cmd
        self.cwd = cwd

        self.in_queue = queue.Queue()  # input data
        self.out_queue = queue.Queue()  # output results

    def write(self, buf) -> None:
        """Write data to the process

        Args:
            buf: The data to write to the process
        """

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

    def start(self, *_) -> None:
        """Start the process and the input/output threads"""

        self.p = subprocess.Popen(
            self.cmd,
            cwd=self.cwd,
            stdout=subprocess.PIPE,
            stdin=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
        )
        self.base.logger.info(f"PID: {self.p.pid} CMD: {self.cmd} CWD: {self.cwd}")

        Thread(target=self._process_in, daemon=True).start()
        self.t_out = Thread(target=self._process_out, daemon=True)
        self.t_out.start()

        # Debugging purposes
        self.t_err = Thread(target=self._process_err, daemon=True)
        self.t_err.start()

    def stop(self, *_) -> None:
        """Stop the process"""

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
            try:
                self.p.stdin.flush()
            except OSError:
                pass

    def _process_out(self) -> None:
        while self.alive:
            data = self.p.stdout.read(1)
            if not data:
                break
            self.out_queue.put(data)

    def _process_err(self) -> None:
        while self.alive:
            data = self.p.stderr.read(1)
            if not data:
                break
            print(data.decode(), end="", flush=True)  # Print to the console
