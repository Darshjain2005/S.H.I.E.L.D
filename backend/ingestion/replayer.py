import json
import time
from pathlib import Path
from typing import List, Generator

from backend.ingestion.parser import LogParser
from backend.schemas.event import EventCreate

class LogReplayer:
    def __init__(self, logs_dir: str):
        self.logs_dir = Path(logs_dir)
        self.parser = LogParser()
        
    def get_scenario_events(self, scenario_name: str) -> List[EventCreate]:
        scenario_file = self.logs_dir / scenario_name / "scenario.jsonl"
        if not scenario_file.exists():
            return []
            
        with open(scenario_file, "r") as f:
            content = f.read()
            
        return self.parser.parse_json_lines(content)
        
    def stream_events(self, scenario_name: str, delay_ms: int = 200) -> Generator[EventCreate, None, None]:
        events = self.get_scenario_events(scenario_name)
        for event in events:
            yield event
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
