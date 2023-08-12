import git


class GitRepo(git.Repo):
    def __init__(self, master=None, path=None, *args, **kwargs):
        super().__init__(path, *args, **kwargs)
        self.master = master
        self.path = path
        self.config = self.config_reader()

        self.author_name = self.config.get_value("user", "name")
        self.author_email = self.config.get_value("user", "email")
        self.author = git.Actor(self.author_name, self.author_email)
    
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
            # change type can be 0, 1, 2, 3
            # respectively represents Deleted, Added, Modified, Untracked
            if change_type == 0:
                self.do(self.index.remove, [path])
            else:
                self.do(self.index.add, [path])

    def unstage_files(self, *paths):
        self.index.reset(paths=paths)
    
    def discard_changes(self, *path):
        self.git.checkout("--", *path)

    def commit_files(self, message=None, **kwargs):
        if not message:
            message = "Commit changes"
    
        return self.index.commit(message, author=self.author, **kwargs)

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
            self.master.base.notifications.error(e) 
