"""Profile text.py proxy overhead in detail."""
import os
import sys
import time
import tkinter as tk
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / 'src'))
os.environ['ENVIRONMENT'] = 'test'

def profile_proxy_overhead():
    """Measure the overhead of every operation in the proxy path."""
    from biscuit import App
    
    app = App()
    app.update()
    time.sleep(0.5)
    
    # Create a test file
    test_file = Path('test_proxy.py')
    with open(test_file, 'w') as f:
        for i in range(3000):
            f.write(f"def function_{i}(x, y):\n")
            f.write(f"    return x + y + {i}\n\n")
    
    try:
        app.editorsmanager.open_editor(str(test_file.absolute()))
        app.update()
        time.sleep(1)
        
        editor = app.editorsmanager.active_editor
        text = editor.content.text
        
        print("=" * 80)
        print("PROXY PATH OVERHEAD ANALYSIS")
        print("=" * 80)
        
        # 1. Measure _capture_edit_info_before overhead
        print("\n1. _capture_edit_info_before() overhead (10 calls):")
        text.mark_set('insert', '100.0')
        times = []
        for _ in range(10):
            start = time.perf_counter()
            info = text._capture_edit_info_before(('insert', 'insert', 'x'))
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 2. Measure _point_to_byte overhead
        print("\n2. _point_to_byte() overhead (100 calls):")
        times = []
        for i in range(100):
            start = time.perf_counter()
            byte = text._point_to_byte((i % 100, 0))
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.4f}ms")
        print(f"   Min: {min(times):.4f}ms, Max: {max(times):.4f}ms")
        print(f"   Total for 100 calls: {sum(times):.3f}ms")
        
        # 3. Measure _tk_index_to_point overhead
        print("\n3. _tk_index_to_point() overhead (100 calls):")
        times = []
        for i in range(100):
            start = time.perf_counter()
            point = text._tk_index_to_point(f"{i+1}.0")
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.4f}ms")
        print(f"   Min: {min(times):.4f}ms, Max: {max(times):.4f}ms")
        
        # 4. Measure _is_scroll_op overhead
        print("\n4. _is_scroll_op() overhead (1000 calls):")
        test_args = ('yview', 'scroll', 1, 'units')
        times = []
        for _ in range(1000):
            start = time.perf_counter()
            result = text._is_scroll_op(test_args)
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.6f}ms")
        print(f"   Min: {min(times):.6f}ms, Max: {max(times):.6f}ms")
        
        # 5. Measure _finalize_edit_info overhead
        print("\n5. _finalize_edit_info() overhead (10 calls):")
        text.mark_set('insert', '100.0')
        times = []
        for _ in range(10):
            edit_info = {
                "op": "insert",
                "start_byte": 1000,
                "old_end_byte": 1000,
                "start_point": (99, 0),
                "old_end_point": (99, 0),
            }
            start = time.perf_counter()
            text._finalize_edit_info(edit_info, ('insert', 'insert', 'x'))
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
        # 6. Measure _notify_lsp_change overhead
        print("\n6. _notify_lsp_change() overhead (100 calls):")
        times = []
        for _ in range(100):
            start = time.perf_counter()
            text._notify_lsp_change()
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.4f}ms")
        print(f"   Min: {min(times):.4f}ms, Max: {max(times):.4f}ms")
        
        # 7. Check if incremental highlighting is actually working
        print("\n7. Incremental highlighting status:")
        print(f"   Pending edit infos: {len(text._pending_edit_infos)}")
        print(f"   Force full highlight: {text._force_full_highlight}")
        print(f"   Has incremental_highlight_many: {hasattr(text.highlighter, 'incremental_highlight_many')}")
        
        # 8. Measure event_generate overhead
        print("\n8. event_generate() overhead (100 calls):")
        times = []
        for _ in range(100):
            start = time.perf_counter()
            text.event_generate("<<TestEvent>>", when="tail")
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.4f}ms")
        print(f"   Min: {min(times):.4f}ms, Max: {max(times):.4f}ms")
        
        # 9. Full proxy call overhead (simulated)
        print("\n9. Full proxy simulation (10 insert operations):")
        text.mark_set('insert', '100.0')
        times = []
        for _ in range(10):
            start = time.perf_counter()
            # Simulate what _proxy does
            args = ('insert', 'insert', 'x')
            is_edit = args[0] in ("insert", "replace", "delete")
            edit_info = text._capture_edit_info_before(args) if is_edit else None
            
            # Execute the actual operation
            text.insert('insert', 'y')
            
            if is_edit:
                if edit_info:
                    text._finalize_edit_info(edit_info, args)
                else:
                    text._force_full_highlight = True
                text._cached_all_text = None
                text.event_generate("<<Change>>", when="tail")
                text._notify_lsp_change()
            
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)
        print(f"   Mean: {sum(times)/len(times):.3f}ms")
        print(f"   Min: {min(times):.3f}ms, Max: {max(times):.3f}ms")
        
    finally:
        app.destroy()
        if test_file.exists():
            test_file.unlink()

if __name__ == '__main__':
    profile_proxy_overhead()
