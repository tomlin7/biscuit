import json

import requests

url = "https://raw.githubusercontent.com/microsoft/vscode-codicons/refs/heads/main/src/template/mapping.json"
r = requests.get(url).content
data = json.loads(r)

out = "from enum import StrEnum\n\n\nclass Icons(StrEnum):\n"
for key, value in data.items():
    value = f"\\u{hex(value)[2:].zfill(4)}"
    print(key, value)
    out += f'    {key.upper().replace("-", "_")} = "{value}"\n'


with open("icons.py", "w") as f:
    f.write(out)
