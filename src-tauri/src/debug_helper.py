import json
import os
import sys

try:
    import debugpy
except ModuleNotFoundError as exc:
    print(json.dumps({"event": "error", "message": str(exc)}), file=sys.stderr, flush=True)
    raise SystemExit(1)

debugpy.configure({"subProcess": False})

import bdb
import runpy


def emit(payload):
    print(json.dumps(payload), file=sys.stderr, flush=True)


class Session(bdb.Bdb):
    def user_line(self, frame):
        if not self.break_here(frame):
            return
        frames = []
        current = frame
        while current is not None:
            frames.append(
                {
                    "name": current.f_code.co_name,
                    "file": current.f_code.co_filename,
                    "line": current.f_lineno,
                }
            )
            current = current.f_back
        locals_map = {}
        for key, value in frame.f_locals.items():
            if key.startswith("__"):
                continue
            try:
                shown = repr(value)
            except Exception:
                shown = "<unrepresentable>"
            locals_map[key] = shown[:180]
        emit({"event": "stopped", "frames": frames, "locals": locals_map})
        self.wait(frame)

    def wait(self, frame):
        while True:
            line = sys.stdin.readline()
            if line == "":
                raise SystemExit(0)
            command = line.strip()
            if command == "continue":
                return
            if command == "next":
                self.set_next(frame)
                return
            if command == "step":
                self.set_step()
                return
            if command == "return":
                self.set_return(frame)
                return


def main():
    script = os.path.abspath(sys.argv[1])
    breaks = json.loads(sys.argv[2])
    session = Session()
    for item in breaks:
        session.set_break(os.path.abspath(item["file"]), int(item["line"]))
    try:
        session.runcall(runpy.run_path, script, run_name="__main__")
    except SystemExit:
        pass
    except Exception as exc:
        emit({"event": "error", "message": str(exc)})
        raise SystemExit(1)
    emit({"event": "exited"})


if __name__ == "__main__":
    main()
