import json
import csv
from datetime import datetime
import uuid
from io import StringIO
from typing import List, Dict, Any

from backend.schemas.event import EventCreate

class LogParser:
    def __init__(self):
        pass
        
    def parse_json_lines(self, file_content: str) -> List[EventCreate]:
        events = []
        for line in file_content.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                events.append(self._normalize_dict(data, line))
            except json.JSONDecodeError:
                continue
        return events
        
    def parse_csv(self, file_content: str) -> List[EventCreate]:
        events = []
        reader = csv.DictReader(StringIO(file_content))
        for row in reader:
            events.append(self._normalize_dict(row, str(row)))
        return events
        
    def _normalize_dict(self, data: Dict[str, Any], raw_log: str) -> EventCreate:
        # Generate a new ID if missing
        event_id = data.get("event_id") or f"EVT-{uuid.uuid4().hex[:8]}"
        
        # Parse timestamp, default to now if missing/invalid
        timestamp = datetime.utcnow()
        if "timestamp" in data:
            try:
                # Try ISO format
                timestamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass
                
        # Extract fields
        return EventCreate(
            event_id=event_id,
            timestamp=timestamp,
            source=data.get("source", "unknown"),
            event_type=data.get("event_type", "unknown"),
            severity=data.get("severity", "low"),
            src_ip=data.get("src_ip"),
            dst_ip=data.get("dst_ip"),
            src_port=int(data["src_port"]) if data.get("src_port") else None,
            dst_port=int(data["dst_port"]) if data.get("dst_port") else None,
            user=data.get("user"),
            hostname=data.get("hostname"),
            process=data.get("process"),
            message=data.get("message"),
            raw_log=raw_log,
            metadata_=data.get("metadata", {})
        )
