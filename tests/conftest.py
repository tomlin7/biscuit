import os

import pytest
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(".env"))

from biscuit import get_app_instance


@pytest.fixture(scope="session")
def app_instance():
    app = get_app_instance(
        os.path.abspath("biscuit/src"),
    )
    yield app
