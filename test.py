class A:
    thing1 ="asdf"

class B(A):
    thing2 = "test"
    def __init__(self):
        super().__init__()
        self.thing1 = "not"


class C(B, A):
    def __init__(self):
        super().__init__()
        print(self.thing1)
        print(self.thing2)
C()