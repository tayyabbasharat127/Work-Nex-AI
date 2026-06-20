"""pytest configuration — sets async mode for the entire test suite."""
import asyncio
import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as async")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
