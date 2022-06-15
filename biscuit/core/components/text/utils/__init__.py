class Utils:
    @staticmethod
    def clamp(value, min_val, max_val):
	    return min(max(min_val, value), max_val)