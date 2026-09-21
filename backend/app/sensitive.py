import re
from typing import Tuple, Optional

# Regex patterns
PAN_REGEX = re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', re.IGNORECASE)
AADHAAR_REGEX = re.compile(r'\b\d{4}\s?\d{4}\s?\d{4}\b')
PASSPORT_REGEX = re.compile(r'\b[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]\b')
BANK_IFSC_REGEX = re.compile(r'\b[A-Z]{4}0[A-Z0-9]{6}\b', re.IGNORECASE)

# Keywords indicating personal or financial records
SENSITIVE_FILENAME_KEYWORDS = [
    "aadhaar", "aadhar", "pan_card", "pancard", "passport", "voter_id",
    "salary_slip", "payslip", "bank_statement", "account_statement",
    "tax_return", "itr", "form_16", "marksheet", "degree_certificate"
]

FINANCIAL_TEXT_KEYWORDS = [
    "account statement", "account number", "closing balance", "ifsc code",
    "income tax department", "permanent account number", "unique identification authority",
    "enrolment no", "republic of india passport"
]

def check_sensitive_document(filename: str, text_snippet: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Checks if a document contains sensitive personal/financial information.
    Returns: (is_sensitive, detected_type)
    """
    name_lower = filename.lower()
    
    # 1. Filename heuristic
    for kw in SENSITIVE_FILENAME_KEYWORDS:
        if kw in name_lower:
            return True, f"Filename contains '{kw}'"

    if not text_snippet:
        return False, None

    snippet_lower = text_snippet.lower()

    # 2. PAN Card
    if PAN_REGEX.search(text_snippet) and ("income tax" in snippet_lower or "permanent account" in snippet_lower or "pan" in snippet_lower):
        return True, "Contains Indian PAN Card pattern"

    # 3. Aadhaar Card
    if AADHAAR_REGEX.search(text_snippet) and ("uidai" in snippet_lower or "aadhaar" in snippet_lower or "aadhar" in snippet_lower or "government of india" in snippet_lower):
        return True, "Contains Aadhaar number and UIDAI markers"

    # 4. Bank Statement / IFSC
    if BANK_IFSC_REGEX.search(text_snippet) or any(kw in snippet_lower for kw in FINANCIAL_TEXT_KEYWORDS):
        return True, "Contains banking/statement/financial identifiers"

    # 5. Passport
    if PASSPORT_REGEX.search(text_snippet) and "passport" in snippet_lower:
        return True, "Contains passport identifier"

    return False, None
