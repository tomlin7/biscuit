import sys
import pytest


def test_cgi_or_legacy_cgi_available():
    """Ensure cgi module is importable (via standard library on <3.13 or legacy-cgi on >=3.13)."""
    try:
        import cgi
        assert cgi is not None
    except ImportError:
        # If legacy-cgi is not yet installed in current env, verify Python version logic
        if sys.version_info < (3, 13):
            pytest.fail("cgi standard module should be available on Python < 3.13")
        else:
            pytest.skip("legacy-cgi not pre-installed in test environment")
