import git


class GitRepo(git.Repo):
    def __init__(self, path, *args, **kwargs):
        super().__init__(path, *args, **kwargs)
        self.path = path
        
    def get_commit_hash(self):
        return self.head.commit.hexsha

    def get_commit_message(self):
        return self.head.commit.message

    def get_commit_author(self):
        return self.head.commit.author.name

    def get_commit_date(self):
        return self.head.commit.committed_date

    def get_branch_name(self):
        return self.active_branch.name

    def get_branch_commit_hash(self):
        return self.active_branch.commit.hexsha

    def get_branch_commit_message(self):
        return self.active_branch.commit.message

    def get_branch_commit_author(self):
        return self.active_branch.commit.author.name

    def get_branch_commit_date(self):
        return self.active_branch.commit.committed_date

    def get_branch_remote_name(self):
        return self.active_branch.remote_name

    def get_branch_remote_url(self):
        return self.active_branch.remote_url

    def get_branch_remote_commit_hash(self):
        return self.active_branch.remote_head.commit.hexsha

    def get_branch_remote_commit_message(self):
        return self.active_branch.remote_head.commit.message

    def get_branch_remote_commit_author(self):
        return self.active_branch.remote_head.commit.author.name

    def get_branch_remote_commit_date(self):
        return self.active_branch.remote_head.commit.committed_date
