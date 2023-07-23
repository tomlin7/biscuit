import tkinter as tk

import git


def get_commit_data(file_path):
    repo = git.Repo(search_parent_directories=True)
    commits = repo.iter_commits(paths=file_path)
    commit_data = [commit.message.strip() for commit in commits]
    return commit_data

def handle_codelens_click(event):
    line_number = int(event.widget.tag_names(tk.CURRENT)[0])  # Extract the line number from the tag
    commit_data = get_commit_data("your_file_path_here")
    if len(commit_data) >= line_number:
        commit = commit_data[line_number - 1]
        print(f"Clicked CodeLens on line {line_number}. Commit data: {commit}")

root = tk.Tk()

text = tk.Text(root)
text.pack()

# Add sample text
for i in range(1, 11):
    text.insert(tk.END, f"This is line {i}\n")

# Create CodeLens annotations with commit data
commit_data = get_commit_data("SECURITY.md")
for line_number, commit in enumerate(commit_data, start=1):
    tag = f"line_{line_number}"
    text.tag_configure(tag, underline=True, foreground="blue")
    text.tag_bind(tag, "<Button-1>", handle_codelens_click)
    text.insert(f"{line_number}.0", f"[CodeLens] {commit}\n", tag)

root.mainloop()
