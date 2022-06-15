import git


class GitRepo(git.Repo):
    def __init__(self, path, *args, **kwargs):
        super().__init__(path, *args, **kwargs)
        self.path = path
    
    def get_untracked_files(self):
        return self.untracked_files
    
    def get_changed_files(self):
        return [item.a_path for item in self.index.diff(None).iter_change_type('M')]
    
    def get_latest_commit(self):
        return self.head.commit
    
    def get_commit_filedata(self, filename):
        return self.head.commit.tree[filename].data_stream.read().decode('utf-8')
