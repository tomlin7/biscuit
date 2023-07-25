import os

import pytest
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv('.env'))

from biscuit import App


@pytest.fixture(scope="session")
def app_instance():
    app = App(os.path.abspath('biscuit/biscuit'), )
    yield app