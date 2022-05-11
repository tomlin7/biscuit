import sys
import platform
from dataclasses import dataclass


@dataclass
class SysInfo:
    os: None
    version: None
    release: None
    machine: None
    processor: None
    python_version: None

    def __init__(self, master):
        self.base = master
        
        self.os = platform.system()
        self.version = platform.version()
        self.release = platform.release()
        self.machine = platform.machine()
        self.processor = platform.processor()
        self.python_version = sys.version

    def __str__(self):
        return f"""
        OS: {self.os} ({self.version}, {self.release})
        Machine: {self.machine}
        Processor: {self.processor}
        Python Version: {self.python_version}
        """
