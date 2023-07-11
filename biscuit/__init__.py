__version__ = '2.5.0'

import sys
from os.path import abspath, dirname, join
sys.path.append(abspath(join(dirname(__file__), '.')))

from .app import App