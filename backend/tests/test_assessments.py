def create_student(client, headers, student_id="100000001", grade="5"):
    return client.post(
        "/api/v1/students",
        json={"student_id": student_id, "first_name": "Jasleen", "last_name": "Kaur", "grade": grade},
        headers=headers,
    )


def test_create_assessment_computes_term_and_year(client, teacher_headers, category):
    cat, level = category
    create_student(client, teacher_headers)

    response = client.post(
        "/api/v1/students/100000001/assessments",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2026-10-15",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["assessment_term"] == 1
    assert body["academic_year"] == "2026-2027"


def test_create_assessment_rejects_summer_dates(client, teacher_headers, category):
    cat, level = category
    create_student(client, teacher_headers)

    response = client.post(
        "/api/v1/students/100000001/assessments",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2026-08-01",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_create_assessment_rejects_mismatched_level_and_category(client, teacher_headers, category, db):
    from app import models

    cat, level = category
    other_cat = models.Category(category_name="Other Category")
    db.add(other_cat)
    db.commit()
    db.refresh(other_cat)

    create_student(client, teacher_headers)
    response = client.post(
        "/api/v1/students/100000001/assessments",
        json={
            "category_id": other_cat.id,
            "level_id": level.id,
            "assessment_date": "2026-10-15",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_assessments_hidden_from_other_school_teacher(client, teacher_headers, other_teacher_headers, category):
    cat, level = category
    create_student(client, teacher_headers)
    client.post(
        "/api/v1/students/100000001/assessments",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2026-10-15",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )

    response = client.get("/api/v1/students/100000001/assessments", headers=other_teacher_headers)
    assert response.status_code == 404


def test_update_and_delete_assessment(client, teacher_headers, category):
    cat, level = category
    create_student(client, teacher_headers)
    create_response = client.post(
        "/api/v1/students/100000001/assessments",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2026-10-15",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )
    assessment_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/v1/students/100000001/assessments/{assessment_id}",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2027-02-01",
            "assessed_by": "Teacher User",
            "comments": "Updated",
        },
        headers=teacher_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["assessment_term"] == 2
    assert update_response.json()["comments"] == "Updated"

    delete_response = client.delete(
        f"/api/v1/students/100000001/assessments/{assessment_id}", headers=teacher_headers
    )
    assert delete_response.status_code == 204

    list_response = client.get("/api/v1/students/100000001/assessments", headers=teacher_headers)
    assert list_response.json() == []


def test_grade_progress_averages_current_levels(client, teacher_headers, category, db):
    from app import models

    cat, level = category
    level_2 = models.CategoryLevel(category_id=cat.id, level_number=2, description="Level 2")
    db.add(level_2)
    db.commit()
    db.refresh(level_2)

    create_student(client, teacher_headers, student_id="100000001", grade="5")
    create_student(client, teacher_headers, student_id="100000002", grade="5")

    client.post(
        "/api/v1/students/100000001/assessments",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2026-10-01",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )
    client.post(
        "/api/v1/students/100000002/assessments",
        json={
            "category_id": cat.id,
            "level_id": level_2.id,
            "assessment_date": "2026-10-01",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )

    response = client.get("/api/v1/grades/5/progress", headers=teacher_headers)
    assert response.status_code == 200
    row = next(r for r in response.json() if r["category_id"] == cat.id)
    assert row["average_level"] == 1.5
    assert row["student_count"] == 2
    assert row["max_level"] == 2


def test_grade_progress_includes_categories_with_no_assessments(client, teacher_headers, category):
    cat, _ = category
    create_student(client, teacher_headers, grade="5")

    response = client.get("/api/v1/grades/5/progress", headers=teacher_headers)
    row = next(r for r in response.json() if r["category_id"] == cat.id)
    assert row["average_level"] is None
    assert row["student_count"] == 0


def test_grade_progress_scoped_to_teacher_school(client, teacher_headers, other_teacher_headers, category):
    cat, level = category
    create_student(client, other_teacher_headers, student_id="100000002", grade="5")
    client.post(
        "/api/v1/students/100000002/assessments",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2026-10-01",
            "assessed_by": "Newton Teacher",
        },
        headers=other_teacher_headers,
    )

    response = client.get("/api/v1/grades/5/progress", headers=teacher_headers)
    row = next(r for r in response.json() if r["category_id"] == cat.id)
    assert row["student_count"] == 0
