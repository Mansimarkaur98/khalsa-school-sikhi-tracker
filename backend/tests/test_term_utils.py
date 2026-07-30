from datetime import date

import pytest

from app.term_utils import BlockedAssessmentDateError, compute_term_and_year


@pytest.mark.parametrize(
    "d, expected_term, expected_year",
    [
        (date(2026, 9, 1), 1, "2026-2027"),
        (date(2026, 12, 31), 1, "2026-2027"),
        (date(2027, 1, 1), 2, "2026-2027"),
        (date(2027, 3, 31), 2, "2026-2027"),
        (date(2027, 4, 1), 3, "2026-2027"),
        (date(2027, 6, 30), 3, "2026-2027"),
    ],
)
def test_compute_term_and_year(d, expected_term, expected_year):
    term, academic_year = compute_term_and_year(d)
    assert term == expected_term
    assert academic_year == expected_year


@pytest.mark.parametrize("d", [date(2027, 7, 15), date(2027, 8, 31)])
def test_summer_months_are_blocked(d):
    with pytest.raises(BlockedAssessmentDateError):
        compute_term_and_year(d)
