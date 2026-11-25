from sortedcontainers import SortedDict

from .textindex import TextIndex


class MinClosestKeyDict(SortedDict):
    """A dictionary that returns the value of the closest key that is less than the requested key
    if the requested key is not found in the dictionary."""

    def __setitem__(self, key, value):
        super().__setitem__(TextIndex(key), value)

    def __getitem__(self, key):
        text_key = TextIndex(key)
        if text_key in self:
            return super().__getitem__(text_key), text_key

        # key not found, return the closest key that is less than the requested key
        less = self.bisect_left(text_key)
        if less == 0:
            raise KeyError(f"No key found that is less than {key}")

        closest_key = self.keys()[less - 1]
        return super().__getitem__(closest_key), closest_key


# class MinClosestKeyDict(dict):
#     """A dictionary that returns the value of the closest key that is less than the requested key
#     if the requested key is not found in the dictionary."""

#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)

#         self._sorted_keys = sorted(self.keys())

#     def __setitem__(self, key, value):
#         if key not in self:
#             bisect.insort(self._sorted_keys, key, key=lambda x: x.replace(".", ""))

#         super().__setitem__(key, value)

#     def __delitem__(self, key):
#         super().__delitem__(key)
#         self._sorted_keys.remove(key)

#     def __getitem__(self, key):
#         if key in self:
#             return super().__getitem__(key)

#         pos = bisect.bisect_left(self._sorted_keys, key.replace(".", ""))
#         if pos == 0:
#             raise KeyError(f"No key found that is less than {key}")

#         closest_key = self._sorted_keys[pos - 1]

#         return super().__getitem__(closest_key)
