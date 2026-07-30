def student_payload(**overrides):
    payload = {
        "student_id": "100000001",
        "first_name": "Jasleen",
        "last_name": "Kaur",
        "grade": "5",
    }
    payload.update(overrides)
    return payload


def test_unauthenticated_request_is_rejected(client):
    response = client.get("/api/v1/students")
    assert response.status_code in (401, 403)


def test_create_student_as_teacher_uses_own_school(client, teacher_headers, teacher_user, fraser_valley):
    response = client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["school_id"] == fraser_valley.id
    assert body["created_by"] == f"{teacher_user.first_name} {teacher_user.last_name}"
    assert body["updated_by"] == f"{teacher_user.first_name} {teacher_user.last_name}"


def test_create_student_as_admin_requires_school_id(client, admin_headers):
    response = client.post("/api/v1/students", json=student_payload(), headers=admin_headers)
    assert response.status_code == 400


def test_create_student_as_admin_with_school_id(client, admin_headers, newton):
    response = client.post(
        "/api/v1/students", json=student_payload(grade="5", school_id=newton.id), headers=admin_headers
    )
    assert response.status_code == 201
    assert response.json()["school_id"] == newton.id


def test_create_student_rejects_grade_outside_school_range(client, admin_headers, newton):
    # Newton only serves grades 4-7.
    response = client.post(
        "/api/v1/students", json=student_payload(grade="10", school_id=newton.id), headers=admin_headers
    )
    assert response.status_code == 400


def test_create_student_rejects_duplicate_student_id(client, teacher_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    response = client.post("/api/v1/students", json=student_payload(first_name="Another"), headers=teacher_headers)
    assert response.status_code == 409
    assert "conflicting_student" in response.json()["detail"]


def test_create_student_rejects_invalid_student_id_format(client, teacher_headers):
    response = client.post("/api/v1/students", json=student_payload(student_id="123"), headers=teacher_headers)
    assert response.status_code == 422


def test_list_students_scoped_to_teacher_school(
    client, teacher_headers, other_teacher_headers, fraser_valley, newton
):
    client.post("/api/v1/students", json=student_payload(student_id="100000001"), headers=teacher_headers)
    client.post(
        "/api/v1/students",
        json=student_payload(student_id="100000002", grade="6"),
        headers=other_teacher_headers,
    )

    response = client.get("/api/v1/students", headers=teacher_headers)
    assert response.status_code == 200
    ids = [s["student_id"] for s in response.json()]
    assert ids == ["100000001"]


def test_list_students_admin_sees_all_schools(client, admin_headers, teacher_headers, other_teacher_headers):
    client.post("/api/v1/students", json=student_payload(student_id="100000001"), headers=teacher_headers)
    client.post(
        "/api/v1/students",
        json=student_payload(student_id="100000002", grade="6"),
        headers=other_teacher_headers,
    )

    response = client.get("/api/v1/students", headers=admin_headers)
    assert response.status_code == 200
    ids = {s["student_id"] for s in response.json()}
    assert ids == {"100000001", "100000002"}


def test_list_students_admin_can_filter_by_school(client, admin_headers, teacher_headers, other_teacher_headers, newton):
    client.post("/api/v1/students", json=student_payload(student_id="100000001"), headers=teacher_headers)
    client.post(
        "/api/v1/students",
        json=student_payload(student_id="100000002", grade="6"),
        headers=other_teacher_headers,
    )

    response = client.get(f"/api/v1/students?school_id={newton.id}", headers=admin_headers)
    assert response.status_code == 200
    ids = [s["student_id"] for s in response.json()]
    assert ids == ["100000002"]


def test_list_students_excludes_inactive_by_default(client, teacher_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    client.delete("/api/v1/students/100000001", headers=teacher_headers)

    active_only = client.get("/api/v1/students", headers=teacher_headers)
    assert active_only.json() == []

    with_inactive = client.get("/api/v1/students?include_inactive=true", headers=teacher_headers)
    assert len(with_inactive.json()) == 1


def test_get_student_hidden_from_other_school_teacher(client, teacher_headers, other_teacher_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    response = client.get("/api/v1/students/100000001", headers=other_teacher_headers)
    assert response.status_code == 404


def test_get_student_visible_to_admin_regardless_of_school(client, teacher_headers, admin_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    response = client.get("/api/v1/students/100000001", headers=admin_headers)
    assert response.status_code == 200


def test_update_student_sets_updated_by(client, teacher_headers, admin_headers, admin_user):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    response = client.put(
        "/api/v1/students/100000001",
        json={"first_name": "Jasleen", "last_name": "Kaur", "grade": "6"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    assert response.json()["updated_by"] == f"{admin_user.first_name} {admin_user.last_name}"
    assert response.json()["grade"] == "6"


def test_update_student_rejects_grade_outside_current_school_range(client, teacher_headers):
    # Fraser Valley serves grades 4-12; grade 2 is out of range.
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    response = client.put(
        "/api/v1/students/100000001",
        json={"first_name": "Jasleen", "last_name": "Kaur", "grade": "2"},
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_teacher_cannot_reassign_student_school(client, teacher_headers, newton):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    response = client.put(
        "/api/v1/students/100000001",
        json={"first_name": "Jasleen", "last_name": "Kaur", "grade": "6", "school_id": newton.id},
        headers=teacher_headers,
    )
    assert response.status_code == 403


def test_admin_can_reassign_student_school_and_grade_is_revalidated(client, teacher_headers, admin_headers, newton):
    client.post("/api/v1/students", json=student_payload(grade="6"), headers=teacher_headers)

    # Moving a grade-6 student into Newton (4-7) should succeed.
    ok_response = client.put(
        "/api/v1/students/100000001",
        json={"first_name": "Jasleen", "last_name": "Kaur", "grade": "6", "school_id": newton.id},
        headers=admin_headers,
    )
    assert ok_response.status_code == 200
    assert ok_response.json()["school_id"] == newton.id

    # Now try moving a grade-6 student out of range for a hypothetical secondary-only school.
    # (Reuse Newton's own range check by attempting an out-of-range grade update post-move.)
    bad_response = client.put(
        "/api/v1/students/100000001",
        json={"first_name": "Jasleen", "last_name": "Kaur", "grade": "10"},
        headers=admin_headers,
    )
    assert bad_response.status_code == 400


def test_student_id_immutable_once_assessed(client, teacher_headers, category):
    cat, level = category
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    assessment_response = client.post(
        "/api/v1/students/100000001/assessments",
        json={
            "category_id": cat.id,
            "level_id": level.id,
            "assessment_date": "2026-10-15",
            "assessed_by": "Teacher User",
        },
        headers=teacher_headers,
    )
    assert assessment_response.status_code == 201

    response = client.put(
        "/api/v1/students/100000001",
        json={"first_name": "Jasleen", "last_name": "Kaur", "grade": "5", "student_id": "100000099"},
        headers=teacher_headers,
    )
    assert response.status_code == 400


def test_archive_and_restore_student(client, teacher_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)

    archive_response = client.delete("/api/v1/students/100000001", headers=teacher_headers)
    assert archive_response.status_code == 204

    get_response = client.get("/api/v1/students/100000001", headers=teacher_headers)
    assert get_response.json()["active_status"] is False

    restore_response = client.post("/api/v1/students/100000001/restore", headers=teacher_headers)
    assert restore_response.status_code == 200
    assert restore_response.json()["active_status"] is True


def test_teacher_cannot_permanently_delete_student(client, teacher_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    client.delete("/api/v1/students/100000001", headers=teacher_headers)

    response = client.delete("/api/v1/students/100000001/permanent", headers=teacher_headers)
    assert response.status_code == 403


def test_permanent_delete_requires_archiving_first(client, admin_headers, teacher_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    response = client.delete("/api/v1/students/100000001/permanent", headers=admin_headers)
    assert response.status_code == 400


def test_permanent_delete_blocked_if_has_assessments(client, admin_headers, teacher_headers, category):
    cat, level = category
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
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
    client.delete("/api/v1/students/100000001", headers=teacher_headers)

    response = client.delete("/api/v1/students/100000001/permanent", headers=admin_headers)
    assert response.status_code == 409


def test_admin_permanent_delete_succeeds_when_archived_and_no_assessments(client, admin_headers, teacher_headers):
    client.post("/api/v1/students", json=student_payload(), headers=teacher_headers)
    client.delete("/api/v1/students/100000001", headers=teacher_headers)

    response = client.delete("/api/v1/students/100000001/permanent", headers=admin_headers)
    assert response.status_code == 204

    get_response = client.get("/api/v1/students/100000001", headers=admin_headers)
    assert get_response.status_code == 404
