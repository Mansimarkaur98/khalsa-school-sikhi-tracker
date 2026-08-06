def create_student(client, headers, student_id="100000001", grade="5"):
    return client.post(
        "/api/v1/students",
        json={"student_id": student_id, "first_name": "Jasleen", "last_name": "Kaur", "grade": grade},
        headers=headers,
    )


def create_assessment(client, headers, student_id, category_id, level_id, assessed_by="Teacher"):
    return client.post(
        f"/api/v1/students/{student_id}/assessments",
        json={
            "category_id": category_id,
            "level_id": level_id,
            "assessment_date": "2026-10-01",
            "assessed_by": assessed_by,
        },
        headers=headers,
    )


def test_admin_grade_progress_defaults_to_all_schools(
    client, admin_headers, teacher_headers, other_teacher_headers, category
):
    cat, level = category
    create_student(client, teacher_headers, student_id="100000001", grade="5")
    create_student(client, other_teacher_headers, student_id="100000002", grade="5")
    create_assessment(client, teacher_headers, "100000001", cat.id, level.id)
    create_assessment(client, other_teacher_headers, "100000002", cat.id, level.id)

    response = client.get("/api/v1/grades/5/progress", headers=admin_headers)
    assert response.status_code == 200
    row = next(r for r in response.json() if r["category_id"] == cat.id)
    assert row["student_count"] == 2


def test_admin_grade_progress_can_narrow_to_one_school(
    client, admin_headers, teacher_headers, other_teacher_headers, category, fraser_valley, newton
):
    cat, level = category
    create_student(client, teacher_headers, student_id="100000001", grade="5")
    create_student(client, other_teacher_headers, student_id="100000002", grade="5")
    create_assessment(client, teacher_headers, "100000001", cat.id, level.id)
    create_assessment(client, other_teacher_headers, "100000002", cat.id, level.id)

    fv_response = client.get(
        "/api/v1/grades/5/progress", params={"school_id": fraser_valley.id}, headers=admin_headers
    )
    fv_row = next(r for r in fv_response.json() if r["category_id"] == cat.id)
    assert fv_row["student_count"] == 1

    newton_response = client.get(
        "/api/v1/grades/5/progress", params={"school_id": newton.id}, headers=admin_headers
    )
    newton_row = next(r for r in newton_response.json() if r["category_id"] == cat.id)
    assert newton_row["student_count"] == 1


def test_teacher_cannot_override_school_id(client, teacher_headers, other_teacher_headers, category, newton):
    cat, level = category
    create_student(client, other_teacher_headers, student_id="100000002", grade="5")
    create_assessment(client, other_teacher_headers, "100000002", cat.id, level.id)

    # A teacher passing another school's id should still only see their own school's data.
    response = client.get(
        "/api/v1/grades/5/progress", params={"school_id": newton.id}, headers=teacher_headers
    )
    row = next(r for r in response.json() if r["category_id"] == cat.id)
    assert row["student_count"] == 0
