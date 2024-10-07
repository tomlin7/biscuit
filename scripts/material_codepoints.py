import requests

url = "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints"
r = requests.get(url).content.decode().splitlines()

out = ""
for i, line in enumerate(r):
    if i < 63:
        continue

    name, code = line.split()
    out += f'{name.upper()} = "\\u{code}"\n'

with open("MaterialSymbols.py", "w") as f:
    f.write(out)
