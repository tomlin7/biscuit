import os
import tempfile
from biscuit.views.explorer.dnd import FileDragDropController

def test_file_drag_and_drop():
    ctrl = FileDragDropController()
    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "source.txt")
        with open(src, "w") as f:
            f.write("content")
        target_dir = os.path.join(tmpdir, "dest_dir")
        os.makedirs(target_dir)

        ctrl.start_drag(src)
        assert ctrl.dragged_path == src

        new_path = ctrl.drop_on(target_dir, copy=True)
        assert os.path.exists(new_path)
        assert os.path.exists(src)
        assert ctrl.dragged_path is None
