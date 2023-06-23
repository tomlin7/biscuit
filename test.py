from nbconvert.exporters import PythonExporter

def convert_notebook_to_python(notebook_path, output_path):
    exporter = PythonExporter()
    content, _ = exporter.from_filename(notebook_path)
    
    with open(output_path, 'w') as f:
        f.write(content)
    
    print(f"The notebook {notebook_path} has been converted to Python code and saved at {output_path}.")

# Example usage
notebook_path = 'test.ipynb'
output_path = 'p.py'
convert_notebook_to_python(notebook_path, output_path)
