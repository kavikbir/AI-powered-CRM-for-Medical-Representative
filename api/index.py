import os
import sys

# Add the root directory to the path so we can import from the 'backend' folder
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from backend.main import app
