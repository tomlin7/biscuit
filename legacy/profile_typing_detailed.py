"""Profile typing performance with all optimizations applied."""
import cProfile
import pstats
import io
import time
import tkinter as tk
from biscuit.main import App

def measure_typing():
    """Measure typing performance on a large file."""
    # Create app
    app = App()
    app.update()
    
    # Open a large file
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        for i in range(10000):
            f.write(f"def function_{i}(x):\n    return x * {i}\n\n")
        temp_file = f.name
    
    try:
        app.editorsmanager.open_editor(temp_file)
        app.update()
        time.sleep(0.5)
        
        # Get the text widget
        editor = app.editorsmanager.active_editor
        text = editor.content.text
        
        # Warm up
        for _ in range(10):
            text.insert(tk.END, "x")
            app.update()
        
        # Clear inserted text
        text.delete('1.0', tk.END)
        with open(temp_file, 'r') as f:
            content = f.read()
        text.insert('1.0', content)
        app.update()
        
        # Profile typing
        pr = cProfile.Profile()
        pr.enable()
        
        start = time.perf_counter()
        for i in range(20):
            text.insert(tk.END, "a")
            app.update()
        elapsed = time.perf_counter() - start
        
        pr.disable()
        
        # Print stats
        s = io.StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
        ps.print_stats(30)
        
        print(f"\nTyping 20 characters: {elapsed*1000:.1f}ms ({elapsed*1000/20:.1f}ms per keystroke)")
        print("\nTop 30 functions by cumulative time:")
        print(s.getvalue())
        
        # Also measure refresh time
        print("\n" + "="*80)
        print("Measuring refresh() in isolation:")
        pr2 = cProfile.Profile()
        pr2.enable()
        
        start = time.perf_counter()
        for _ in range(10):
            text.refresh()
        elapsed = time.perf_counter() - start
        
        pr2.disable()
        s2 = io.StringIO()
        ps2 = pstats.Stats(pr2, stream=s2).sort_stats('cumulative')
        ps2.print_stats(20)
        
        print(f"10 refresh() calls: {elapsed*1000:.1f}ms ({elapsed*1000/10:.1f}ms per call)")
        print("\nTop 20 functions in refresh():")
        print(s2.getvalue())
        
    finally:
        app.destroy()
        os.unlink(temp_file)

if __name__ == '__main__':
    measure_typing()
