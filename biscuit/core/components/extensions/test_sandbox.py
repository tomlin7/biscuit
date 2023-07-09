#OBSOLETE implement this sandboxed execution for biscuit extensions

import importlib
import threading
import sys, os


# whitelist of allowed modules
ALLOWED_MODULES = ['math', 'random', '_io']
EXECUTION_TIMEOUT = 5  # seconds

# Function to execute the extension script
def execute_extension(script_path):
    execution_thread = threading.Thread(target=run_extension, args=(script_path,))
    execution_thread.start()

    # Wait for the thread to complete with a timeout
    execution_thread.join(EXECUTION_TIMEOUT)

    # If the thread is still alive, it exceeded the timeout
    if execution_thread.is_alive():
        print("Extension execution timed out.")
        execution_thread.kill()

    print("Extension execution completed.")

# Internal function to run the extension script
def run_extension(script_path):
    # separate process or isolated environment for execution

    # whitelist of imported modules
    allowed_imports = {module: __import__(module) for module in ALLOWED_MODULES}

    def restricted_import(name, globals={}, locals={}, fromlist=[], level=0):
        if name in ALLOWED_MODULES:
            return allowed_imports[name]
    
        raise ImportError("Module '{}' is not allowed.".format(name))
    
    # Load the extension script
    extension_name = os.path.splitext(script_path)[0]
    module_name = f"{extension_name}"
    extension_module = importlib.import_module(module_name)

    # override the import function to enforce module restrictions
    extension_module.__builtins__["__import__"] = restricted_import

    # Execute the extension code
    try:
        extension_module.run()
    except Exception as e:
        print("Extension encountered an error:", str(e))
    finally:
        extension_module.__builtins__["__import__"] = __import__

# Test
execute_extension('test_sandbox_script.py')
