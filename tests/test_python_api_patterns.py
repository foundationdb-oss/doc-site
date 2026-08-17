"""Check the documented Python patterns without a running FoundationDB cluster."""

import ast
import re
import struct
import unittest
from pathlib import Path
from types import SimpleNamespace


DOCUMENT = (Path(__file__).resolve().parents[1] / "docs/api/python.md").read_text(
    encoding="utf-8"
)


def python_examples(markdown):
    return re.findall(r"^```python[^\n]*\n(.*?)^```[ \t]*$", markdown, re.M | re.S)


def load_example(name):
    """Load one documented function, leaving transaction retries to the binding."""
    definitions = []
    for source in python_examples(DOCUMENT):
        if not re.search(rf"^def {re.escape(name)}\(", source, re.M):
            continue
        definitions.extend(
            node
            for node in ast.parse(source).body
            if isinstance(node, ast.FunctionDef) and node.name == name
        )
    if len(definitions) != 1:
        raise AssertionError(f"Expected one documented {name} function")
    namespace = {
        "fdb": SimpleNamespace(transactional=lambda function: function),
        "struct": struct,
    }
    module = ast.Module(body=definitions, type_ignores=[])
    exec(compile(module, f"<docs/api/python.md:{name}>", "exec"), namespace)
    return namespace[name]


class ValueFuture:
    """The released binding returns a future even when the key is absent."""

    def __init__(self, value):
        self.value = value

    def present(self):
        return self.value is not None


class Transaction:
    def __init__(self, values):
        self.values = values

    def __getitem__(self, key):
        return ValueFuture(self.values.get(key))


class PythonApiPatternsTest(unittest.TestCase):
    def test_transaction_examples_use_supported_creation_api(self):
        section = DOCUMENT.split("## Transactions\n", 1)[1].split(
            "\n## Reading Data\n", 1
        )[0]
        for source in python_examples(section):
            for node in ast.walk(ast.parse(source)):
                if not isinstance(node, ast.Call):
                    continue
                function = node.func
                if (
                    isinstance(function, ast.Attribute)
                    and isinstance(function.value, ast.Name)
                    and function.value.id == "db"
                ):
                    self.assertNotEqual(function.attr, "transaction")

    def test_presence_distinguishes_missing_and_empty_values(self):
        exists = load_example("exists")
        transaction = Transaction({b"empty": b"", b"present": b"value"})
        self.assertIs(exists(transaction, b"missing"), False)
        self.assertIs(exists(transaction, b"empty"), True)
        self.assertIs(exists(transaction, b"present"), True)

    def test_counter_resolves_the_read_future(self):
        get_count = load_example("get_count")
        transaction = Transaction(
            {b"zero": struct.pack("<q", 0), b"count": struct.pack("<q", 42)}
        )
        self.assertEqual(get_count(transaction, b"missing"), 0)
        self.assertEqual(get_count(transaction, b"zero"), 0)
        self.assertEqual(get_count(transaction, b"count"), 42)


if __name__ == "__main__":
    unittest.main()
