import os
import pandas as pd
import numpy as np
import random
from backend.detection.isolation_forest.detector import AnomalyDetector

def create_baseline_model():
    print("Generating synthetic normal traffic baseline...")
    # Generate 1000 normal events
    data = []
    for _ in range(1000):
        data.append({
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([80, 443, 53, 22]),
            "bytes_sent": random.randint(100, 5000),
            "bytes_received": random.randint(500, 20000),
            "duration": random.uniform(0.1, 5.0)
        })
    
    df = pd.DataFrame(data)
    
    detector = AnomalyDetector(contamination=0.05)
    detector.train(df)
    
    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    detector.save(model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    create_baseline_model()
