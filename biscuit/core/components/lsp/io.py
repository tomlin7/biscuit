import queue
import subprocess
from threading import Thread


class IO:
    def __init__(self, master, cmd: str, cwd: str) -> None:
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
        self.alive = False
        self.cmd = cmd
        self.cwd = cwd

        self.out_queue = queue.Queue() # output results
        self.in_queue = queue.Queue() # input data

    def write(self, buf) -> None:
        "Write to stdin"
        self.in_queue.put(buf)

    def read(self) -> None:
        "Read from stdout"
        return self.out_queue.get()

    def start(self, *_) -> None:
        "Start the process"
        self.alive = True

        self.p = subprocess.Popen(
            self.cmd, stdout=subprocess.PIPE, cwd=self.cwd,
            stdin=subprocess.PIPE, stderr=subprocess.PIPE,
            startupinfo=subprocess.STARTUPINFO(
                dwFlags=subprocess.STARTF_USESHOWWINDOW
            ))
        print(f"PID: {self.p.pid}\nCMD: {self.cmd}\nCWD: {self.cwd}")

        self.t_out = Thread(target=self._process_out, daemon=True)
        self.t_in = Thread(target=self._process_in, daemon=True)
        self.t_out.start()
        self.t_in.start()

    def stop(self, *_) -> None:
        "Stop the process"
        self.alive = False
        self.p.kill()
        self.p.wait()

    def _process_in(self) -> None:
        while self.alive:
            try:
                chunk = self.in_queue.get(timeout=5)
                self._write(chunk)
            except queue.Empty:
                continue   
    
    def _process_out(self) -> None:
        while True:
            data = self.p.stdout.raw.read(1024)
            self.out_queue.put(data)
            if not data:
                break
            self.out_queue.put(data)

    def _write(self, input) -> None:
        self.p.stdin.write(input)
        self.p.stdin.flush()
    
