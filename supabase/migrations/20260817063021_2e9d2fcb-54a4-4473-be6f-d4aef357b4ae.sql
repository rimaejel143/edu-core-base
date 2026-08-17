-- Teacher assignments: a teacher teaches a subject in a specific grade.
DELETE FROM public.teacher_subjects WHERE grade_id IS NULL;

DELETE FROM public.teacher_subjects a
USING public.teacher_subjects b
WHERE a.ctid < b.ctid
  AND a.teacher_id = b.teacher_id
  AND a.subject_id = b.subject_id
  AND a.grade_id = b.grade_id;

ALTER TABLE public.teacher_subjects ALTER COLUMN grade_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teacher_subjects_unique_assignment
  ON public.teacher_subjects (teacher_id, grade_id, subject_id);

CREATE INDEX IF NOT EXISTS teacher_subjects_grade_subject_idx
  ON public.teacher_subjects (center_id, grade_id, subject_id);

-- Student enrolments: one row per student + subject, carrying grade and teacher.
DELETE FROM public.student_subjects a
USING public.student_subjects b
WHERE a.ctid < b.ctid
  AND a.student_id = b.student_id
  AND a.subject_id = b.subject_id;

UPDATE public.student_subjects ss
SET grade_id = s.grade_id
FROM public.students s
WHERE ss.student_id = s.id AND ss.grade_id IS DISTINCT FROM s.grade_id;

CREATE UNIQUE INDEX IF NOT EXISTS student_subjects_unique_enrolment
  ON public.student_subjects (student_id, subject_id);

-- Subject level is replaced by real grade links.
ALTER TABLE public.subjects DROP COLUMN IF EXISTS level;

-- Convenience view over the assignment relationship.
CREATE OR REPLACE VIEW public.teacher_assignments AS
  SELECT id, center_id, teacher_id, grade_id, subject_id, created_at, updated_at
  FROM public.teacher_subjects;

GRANT SELECT ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;