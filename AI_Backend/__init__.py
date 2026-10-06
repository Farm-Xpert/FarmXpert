"""Expose backend packages when imported from the repository root."""

from pathlib import Path
import sys

_backend_root = str(Path(__file__).resolve().parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)