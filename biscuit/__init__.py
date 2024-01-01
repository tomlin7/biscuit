__version__ = '2.54.2'
__version_info__ = tuple([ int(num) for num in __version__.split('.')])

# For tests to run successfully
import sys
from os.path import abspath, dirname, join

sys.path.append(abspath(join(dirname(__file__), '.')))


from .core import App
