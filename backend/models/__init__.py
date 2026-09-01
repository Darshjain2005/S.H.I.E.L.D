# Add new models to __init__.py so Alembic can discover them
from backend.models.event import NormalizedEvent
from backend.models.incident import SecurityIncident
from backend.models.detection import Detection
