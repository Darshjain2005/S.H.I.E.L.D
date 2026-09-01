import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.db import SessionLocal
from backend.incidents.manager import IncidentManager

db = SessionLocal()
manager = IncidentManager(db)
incidents = manager.get_all_incidents()
if not incidents:
    print("No incidents")
    sys.exit(0)

incident = incidents[0]
print(f"Testing PDF generation for {incident.incident_id}")

from fpdf import FPDF

def sanitize(text):
    if not text:
        return ""
    text = str(text)
    replacements = {
        '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '-', '\u2026': '...', '\u2022': '-'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    text = text.encode('latin-1', 'ignore').decode('latin-1')
    
    words = text.split(' ')
    safe_words = []
    for w in words:
        if len(w) > 70:
            chunks = [w[i:i+70] for i in range(0, len(w), 70)]
            safe_words.append(' '.join(chunks))
        else:
            safe_words.append(w)
    return ' '.join(safe_words)

try:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Helvetica", "B", 18)
    # The API output requires alignment using new kwarg or something?
    # fpdf2 might not like 'ln=True' as boolean, it expects ln=1?
    # Let's test the exact code from main.py
    pdf.cell(0, 12, "ADNEXUS - Incident Report", ln=True, align="C")
    
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, f"Incident: {incident.incident_id}", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 6, sanitize(f"Title: {incident.title}"))
    
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "Detection Evidence", ln=True)
    pdf.set_font("Helvetica", "", 10)
    if incident.evidence:
        for i, ev in enumerate(incident.evidence[:15], 1):
            if isinstance(ev, dict):
                line = f"  {i}. [{ev.get('engine', 'N/A')}] {ev.get('threat_class', 'N/A')} (conf: {ev.get('confidence', 'N/A')})"
            else:
                line = f"  {i}. {ev}"
            pdf.multi_cell(0, 6, sanitize(line))
    
    out = pdf.output()
    print("Success, out is type", type(out))
except Exception as e:
    import traceback
    traceback.print_exc()
