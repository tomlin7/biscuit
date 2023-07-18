import git


class GitRepo(git.Repo):
    def __init__(self, master, path, *args, **kwargs):
        super().__init__(path, *args, **kwargs)
        self.base = master.base
        self.path = path
        self.config = self.config_reader()
    
    def get_untracked_files(self):
        return [item for item in self.untracked_files]

    def get_added_files(self):
        return [item.a_path for item in self.index.diff(None).iter_change_type('A')]

    def get_deleted_files(self):
        return [item.a_path for item in self.index.diff(None).iter_change_type('D')]
    
    def get_modified_files(self):
        return [item.a_path for item in self.index.diff(None).iter_change_type('M')]

    def get_staged_added_files(self):
        return [item.a_path for item in self.index.diff("HEAD").iter_change_type('D')]

    def get_staged_deleted_files(self):
        return [item.a_path for item in self.index.diff("HEAD").iter_change_type('A')]
    
    def get_staged_modified_files(self):
        return [item.a_path for item in self.index.diff("HEAD").iter_change_type('M')]
    
    def get_latest_commit(self):
        return self.head.commit
    
    def get_commit_filedata(self, filename):
        return self.head.commit.tree[filename].data_stream.read().decode('utf-8')
    def stage_files(self, *paths):
        for path, change_type in paths:
            if change_type == 'D':
                self.do(self.index.remove, [path])
            else:
                self.do(self.index.add, [path])

    def unstage_files(self, *paths):
        self.index.reset(paths=paths)

    def commit_files(self, message=None, **kwargs):
        if not message:
            message = "Commit changes"
    
        return self.do(self.index.commit, message, author=self.config.get_value("user", "name"), **kwargs)

    def push_files(self, remote=None, branch=None, **kwargs):
        if not remote:
            remote = "origin"
        if not branch:
            branch = self.active_branch.name
        return self.do(self.remotes[remote].push, branch, **kwargs)
    
    def do(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            self.base.notifications.error(e) 
