from unittest.mock import MagicMock
from biscuit.editor.text.minimap import Minimap

def test_minimap_smooth_yview_sync():
    m = MagicMock(spec=Minimap)
    m.cw = MagicMock()
    m.cw.winfo_height.return_value = 500
    m.yvalue = 0

    Minimap.update_from_yview(m, 0.25, 0.75)
    assert m.yvalue == 125
    m.cw.coords.assert_called_with("slider", 0, 125)
