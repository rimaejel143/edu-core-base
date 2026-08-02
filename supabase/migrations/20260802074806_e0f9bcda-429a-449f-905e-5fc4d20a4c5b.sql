-- GRADES / CLASSES
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level_order INTEGER,
  description TEXT,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (center_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped grades" ON public.grades FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER set_grades_updated_at BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUBJECT <-> GRADE
CREATE TABLE public.subject_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id, grade_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_grades TO authenticated;
GRANT ALL ON public.subject_grades TO service_role;
ALTER TABLE public.subject_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped subject_grades" ON public.subject_grades FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER set_subject_grades_updated_at BEFORE UPDATE ON public.subject_grades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TEACHER <-> SUBJECT
CREATE TABLE public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_subjects TO authenticated;
GRANT ALL ON public.teacher_subjects TO service_role;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped teacher_subjects" ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER set_teacher_subjects_updated_at BEFORE UPDATE ON public.teacher_subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped activity_log" ON public.activity_log FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE INDEX activity_log_center_created_idx ON public.activity_log (center_id, created_at DESC);

-- LINK STUDENTS TO GRADES
ALTER TABLE public.students ADD COLUMN grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL;
ALTER TABLE public.student_subjects ADD COLUMN grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL;
CREATE INDEX students_grade_idx ON public.students (grade_id);