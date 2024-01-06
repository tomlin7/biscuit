import tkinter as tk

import git


def custom_get(start, end):
    content = text.get(start, end)
    tag_ranges = text.tag_ranges("codelens")

    for tag_start, tag_end in zip(tag_ranges[0::2], tag_ranges[1::2]):
        content = content.replace(text.get(tag_start, tag_end), '')

    return content

def get_commit_data(file_path):
    repo = git.Repo(search_parent_directories=True)
    commits = repo.iter_commits(paths=file_path)
    commit_data = [commit.message.strip() for commit in commits]
    return commit_data

def handle_codelens_click(commit):
    # print(f"Commit data: {commit}")
    print(custom_get('1.0', tk.END))

root = tk.Tk()

text = tk.Text(root)
text.pack()

with open("SECURITY.md") as f:
    content = f.read()
    text.insert(tk.END, content)

# Create CodeLens annotations with commit data
commit_data = get_commit_data("SECURITY.md")
for line_number, commit in enumerate(commit_data, start=1):
    text.tag_configure("codelens", underline=True, foreground="blue")
    text.tag_bind("codelens", "<Button-1>", lambda _, commit=commit: handle_codelens_click(commit))
    text.insert(f"{line_number}.0", f"[CodeLens] {commit}\n", "codelens")


root.mainloop()
