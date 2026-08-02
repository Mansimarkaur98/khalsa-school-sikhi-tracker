from datetime import date, timedelta

from app import models


def create_student(client, headers, student_id="100000001", grade="5"):
    return client.post(
        "/api/v1/students",
        json={"student_id": student_id, "first_name": "Jasleen", "last_name": "Kaur", "grade": grade},
        headers=headers,
    )


def create_assessment(client, headers, category_id, level_id, student_id="100000001", assessment_date="2026-10-15"):
    return client.post(
        f"/api/v1/students/{student_id}/assessments",
        json={
            "category_id": category_id,
            "level_id": level_id,
            "assessment_date": assessment_date,
            "assessed_by": "Teacher User",
        },
        headers=headers,
    )


def future_date_str(days=200):
    return (date.today() + timedelta(days=days)).isoformat()


def test_create_goal_requires_prior_assessment(client, teacher_headers, category):
    cat, level = category
    create_student(client, teacher_headers)

    response = client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": level.id, "target_date": future_date_str()},
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_create_goal_succeeds_with_higher_target(client, db, teacher_headers, teacher_user, category):
    cat, level = category
    level_2 = models.CategoryLevel(category_id=cat.id, level_number=2, description="Level 2")
    db.add(level_2)
    db.commit()
    db.refresh(level_2)

    create_student(client, teacher_headers)
    create_assessment(client, teacher_headers, cat.id, level.id)

    response = client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": level_2.id, "target_date": future_date_str()},
        headers=teacher_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["target_level_id"] == level_2.id
    assert body["set_by"] == f"{teacher_user.first_name} {teacher_user.last_name}"


def test_create_goal_rejects_target_equal_to_current_level(client, teacher_headers, category):
    cat, level = category
    create_student(client, teacher_headers)
    create_assessment(client, teacher_headers, cat.id, level.id)

    response = client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": level.id, "target_date": future_date_str()},
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_create_goal_rejects_target_below_current_level(client, db, teacher_headers, category):
    cat, level = category
    level_2 = models.CategoryLevel(category_id=cat.id, level_number=2, description="Level 2")
    db.add(level_2)
    db.commit()
    db.refresh(level_2)

    create_student(client, teacher_headers)
    create_assessment(client, teacher_headers, cat.id, level_2.id)

    response = client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": level.id, "target_date": future_date_str()},
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_create_goal_rejects_past_date(client, db, teacher_headers, category):
    cat, level = category
    level_2 = models.CategoryLevel(category_id=cat.id, level_number=2, description="Level 2")
    db.add(level_2)
    db.commit()
    db.refresh(level_2)

    create_student(client, teacher_headers)
    create_assessment(client, teacher_headers, cat.id, level.id)

    response = client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": level_2.id, "target_date": "2020-01-01"},
        headers=teacher_headers,
    )
    assert response.status_code == 422


def test_create_goal_rejects_mismatched_level_and_category(client, db, teacher_headers, category):
    cat, level = category
    other_cat = models.Category(category_name="Other Category")
    db.add(other_cat)
    db.commit()
    db.refresh(other_cat)
    other_level = models.CategoryLevel(category_id=other_cat.id, level_number=1, description="Other level 1")
    db.add(other_level)
    db.commit()
    db.refresh(other_level)

    create_student(client, teacher_headers)
    create_assessment(client, teacher_headers, cat.id, level.id)

    response = client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": other_level.id, "target_date": future_date_str()},
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_goals_hidden_from_other_school_teacher(client, teacher_headers, other_teacher_headers, category):
    cat, level = category
    create_student(client, teacher_headers)
    create_assessment(client, teacher_headers, cat.id, level.id)

    response = client.get("/api/v1/students/100000001/goals", headers=other_teacher_headers)
    assert response.status_code == 404


def test_list_goals_returns_most_recent_first(client, db, teacher_headers, category):
    cat, level = category
    level_2 = models.CategoryLevel(category_id=cat.id, level_number=2, description="Level 2")
    level_3 = models.CategoryLevel(category_id=cat.id, level_number=3, description="Level 3")
    db.add_all([level_2, level_3])
    db.commit()
    db.refresh(level_2)
    db.refresh(level_3)

    create_student(client, teacher_headers)
    create_assessment(client, teacher_headers, cat.id, level.id)

    client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": level_2.id, "target_date": future_date_str(100)},
        headers=teacher_headers,
    )
    client.post(
        "/api/v1/students/100000001/goals",
        json={"category_id": cat.id, "target_level_id": level_3.id, "target_date": future_date_str(200)},
        headers=teacher_headers,
    )

    response = client.get("/api/v1/students/100000001/goals", headers=teacher_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert body[0]["target_level_id"] == level_3.id
    assert body[1]["target_level_id"] == level_2.id
