import os
import sys
import time
import uuid
import numpy as np
import pandas as pd
from datetime import datetime

# Import ML models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'graphsage')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'rules')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'isolation_forest')))

from backend.schemas.event import EventCreate
from backend.detection.rules.rule_engine import RuleEngine
from backend.detection.isolation_forest.detector import AnomalyDetector

class CICIDSRunner:
    def __init__(self, dataset_path):
        self.dataset_path = dataset_path
        self.feature_cols = None
        self.scaler_mean = None
        self.scaler_std = None
        self.if_detector = None
        self.gs_model = None
        self.X_bg = None
        self.y_bg = None
        
        # Load Rule Engine
        rules_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'rules', 'rules'))
        self.rule_engine = RuleEngine(rules_dir)
        print(f"[CIC] Rule Engine loaded with {len(self.rule_engine.rules)} rules.")
        
    def setup_ml(self):
        """Train Isolation Forest on background traffic and load GraphSAGE."""
        print("[CIC] Loading dataset for ML setup...")
        df = pd.read_csv(self.dataset_path, nrows=2000)
        df.columns = [c.strip() for c in df.columns]
        
        self.feature_cols = [c for c in df.columns if c not in ['Label', 'Flow ID', 'Source IP', 'Destination IP', 'Timestamp', 'Source Port', 'Destination Port', 'Protocol']]
        
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.fillna(0, inplace=True)
        X = df[self.feature_cols].values.astype(np.float32)
        y = np.zeros(len(X))
        
        self.scaler_mean = X.mean(axis=0)
        self.scaler_std = X.std(axis=0) + 1e-8
        
        self.X_bg = (X - self.scaler_mean) / self.scaler_std
        self.y_bg = y
        
        self.if_detector = AnomalyDetector(contamination=0.05)
        self.if_detector.train(df[self.feature_cols])
        print("[CIC] Isolation Forest trained.")
        
        # Try to load GraphSAGE
        try:
            import torch
            from backend.detection.graphsage.model import GraphSAGEDetector
            input_dim = len(self.feature_cols)
            self.gs_model = GraphSAGEDetector(in_channels=input_dim)
            model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'detection', 'graphsage', 'results', 'best_graphsage_model.pth'))
            if os.path.exists(model_path):
                self.gs_model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
                self.gs_model.eval()
                print("[CIC] GraphSAGE loaded.")
        except Exception as e:
            print(f"[CIC] Note: GraphSAGE not loaded ({e})")
            
    def _classify_threat(self, rule_name):
        r = rule_name.lower()
        if "port_scan" in r or "port scan" in r: return "Port Scan"
        elif "dos" in r or "ddos" in r: return "DDoS"
        elif "c2" in r or "beacon" in r: return "C2 Beacon"
        elif "dns" in r or "tunnel" in r: return "DNS Tunnel"
        elif "exfil" in r: return "Data Exfil"
        elif "encrypt" in r or "malware" in r: return "Encrypted Malware"
        return "Anomaly"
        
    def stream_and_detect(self, start_idx=2000, count=500):
        """Yields (EventCreate, List[dict])"""
        print(f"[CIC] Streaming {count} rows starting from {start_idx}...")
        df = pd.read_csv(self.dataset_path, skiprows=range(1, start_idx), nrows=count)
        df.columns = [c.strip() for c in df.columns]
        
        for idx, row in df.iterrows():
            # 1. Create NormalizedEvent
            src_ip = row.get('Source IP', '10.0.0.1')
            dst_ip = row.get('Destination IP', '10.0.0.2')
            src_port = row.get('Source Port', 0)
            dst_port = row.get('Destination Port', 0)
            
            event = EventCreate(
                event_id=f"FLOW-{uuid.uuid4().hex[:8]}",
                timestamp=datetime.utcnow(),
                source="cic_ids2017",
                event_type="network_flow",
                severity="low",
                src_ip=str(src_ip),
                dst_ip=str(dst_ip),
                src_port=int(src_port) if pd.notna(src_port) else 0,
                dst_port=int(dst_port) if pd.notna(dst_port) else 0,
                metadata_={"raw_features": row.to_dict()}
            )
            
            alerts = []
            
            # Extract features for ML
            features_raw = []
            for col in self.feature_cols:
                val = row.get(col, 0.0)
                features_raw.append(float(val) if pd.notna(val) else 0.0)
                
            # 2. Rule Engine
            flow_dict = dict(zip(self.feature_cols, features_raw))
            triggered = self.rule_engine.evaluate_flow(flow_dict)
            if triggered:
                for rule in triggered:
                    cat = self._classify_threat(rule)
                    event.severity = "high"
                    alerts.append({
                        "engine": "Rule Engine",
                        "threat_class": rule,
                        "severity": "high",
                        "confidence": 0.95,
                        "evidence": f"Rule matched: {rule}"
                    })
                    
            # 3. Isolation Forest
            if self.if_detector:
                x_live = np.array([features_raw], dtype=np.float32)
                x_live[np.isinf(x_live)] = 0
                df_live = pd.DataFrame(x_live, columns=self.feature_cols)
                is_anomaly = self.if_detector.predict(df_live).iloc[0]
                if is_anomaly:
                    if event.severity == "low": event.severity = "medium"
                    alerts.append({
                        "engine": "Isolation Forest",
                        "threat_class": "STATISTICAL_ANOMALY",
                        "severity": "medium",
                        "confidence": 0.88,
                        "evidence": "Statistical deviation from baseline traffic"
                    })
                    
            # 4. GraphSAGE
            if self.gs_model:
                try:
                    import torch
                    from backend.detection.graphsage.graph_construction import build_knn_graph
                    x_live = np.array([features_raw], dtype=np.float32)
                    x_live[np.isinf(x_live)] = 0
                    x_scaled = (x_live - self.scaler_mean) / self.scaler_std
                    X_comb = np.vstack([self.X_bg[-50:], x_scaled])
                    y_comb = np.append(self.y_bg[-50:], [0])
                    gdata = build_knn_graph(X_comb, y_comb, k=3)
                    
                    with torch.no_grad():
                        logits = self.gs_model(gdata.x, gdata.edge_index)
                        probs = torch.softmax(logits, dim=1)
                        conf = probs[-1][1].item()
                        
                    if conf > 0.60:
                        event.severity = "critical"
                        alerts.append({
                            "engine": "GraphSAGE",
                            "threat_class": "STRUCTURAL_ANOMALY",
                            "severity": "critical",
                            "confidence": float(conf),
                            "evidence": "Anomalous graph structure detected in traffic flow"
                        })
                except Exception as e:
                    pass
                    
            yield event, (alerts if alerts else None)
