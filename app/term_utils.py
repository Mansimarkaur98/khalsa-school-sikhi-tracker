from datetime import date


class BlockedAssessmentDateError(ValueError):
    """Raised when an assessment_date falls in July or August — no active term."""


def compute_term_and_year(assessment_date: date) -> tuple[int, str]:
    """
    Derive (assessment_term, academic_year) from a date.

    Terms:
      Term 1: Sep - Dec
      Term 2: Jan - Mar
      Term 3: Apr - Jun
      Jul/Aug: blocked, no term (summer break)

    academic_year is formatted as full years, e.g. "2026-2027".
    """
    month, year = assessment_date.month, assessment_date.year

    if month in (7, 8):
        raise BlockedAssessmentDateError(
            "Assessment date falls in July or August; there is no active school term."
        )

    if month >= 9:  # Sep - Dec
        term, start_year = 1, year
    elif month <= 3:  # Jan - Mar
        term, start_year = 2, year - 1
    else:  # Apr - Jun
        term, start_year = 3, year - 1

    end_year = start_year + 1
    academic_year = f"{start_year}-{end_year}"
    return term, academic_year
