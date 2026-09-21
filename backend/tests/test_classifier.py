import pytest
from app.classifier import classify_file
from app.sensitive import check_sensitive_document

def test_tier1_extension_rules():
    res = classify_file("setup_v2.exe", 1024, "ws-1")
    assert res["category"] == "Installers / Archives"
    assert res["tier"] == 1
    
    res = classify_file("script.py", 500, "ws-1")
    assert res["category"] == "Code / Projects"
    assert res["tier"] == 1

def test_tier1_filename_patterns():
    res = classify_file("my_resume_2026.pdf", 2048, "ws-1")
    assert res["category"] == "Documents / Resume"
    
    res = classify_file("Screenshot 2026-10-03.png", 5000, "ws-1")
    assert res["category"] == "Images / Screenshots"
    assert res["subfolder"] == "Screenshots"

def test_sensitive_detection_aadhaar():
    text = "Government of India UIDAI Aadhaar 1234 5678 9012"
    is_sens, reason = check_sensitive_document("document.pdf", text)
    assert is_sens is True
    
    cls_res = classify_file("document.pdf", 2000, "ws-1", text_snippet=text)
    assert cls_res["category"] == "Private / Sensitive"
    assert cls_res["is_sensitive"] is True

def test_sensitive_detection_pan():
    text = "Income Tax Department Permanent Account Number ABCDE1234F"
    is_sens, reason = check_sensitive_document("scan.pdf", text)
    assert is_sens is True
