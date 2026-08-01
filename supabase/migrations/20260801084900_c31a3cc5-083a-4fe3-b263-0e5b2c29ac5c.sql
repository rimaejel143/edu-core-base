
CREATE TYPE public.app_role AS ENUM ('super_admin', 'center_admin');
CREATE TYPE public.record_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE public.student_status AS ENUM ('active', 'inactive', 'graduated', 'suspended');
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centers TO authenticated;
GRANT ALL ON public.centers TO service_role;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_centers_updated BEFORE UPDATE ON public.centers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  center_id UUID REFERENCES public.centers(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_center ON public.profiles(center_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_center_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT center_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_access_center(_center_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin() OR (_center_id IS NOT NULL AND _center_id = public.current_center_id());
$$;

CREATE POLICY "Users read own profile or same center" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.can_access_center(center_id));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Super admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Users read own center" ON public.centers FOR SELECT TO authenticated
  USING (public.can_access_center(id));
CREATE POLICY "Super admins manage centers" ON public.centers FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _center UUID;
BEGIN
  SELECT id INTO _center FROM public.centers ORDER BY created_at LIMIT 1;
  INSERT INTO public.profiles (id, center_id, full_name, email)
  VALUES (NEW.id, _center, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'center_admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender public.gender_type,
  specialization TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.record_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_teachers_center ON public.teachers(center_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped teachers" ON public.teachers FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  level TEXT,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (center_id, name)
);
CREATE INDEX idx_subjects_center ON public.subjects(center_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE public.student_number_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.student_code IS NULL OR NEW.student_code = '' THEN
    NEW.student_code := 'ST-' || lpad(nextval('public.student_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT NOT NULL UNIQUE,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender public.gender_type,
  date_of_birth DATE,
  school TEXT,
  school_grade TEXT,
  phone TEXT,
  email TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.student_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ALTER COLUMN student_code DROP NOT NULL;
CREATE INDEX idx_students_center ON public.students(center_id);
CREATE INDEX idx_students_status ON public.students(center_id, status);
CREATE INDEX idx_students_created ON public.students(center_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped students" ON public.students FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_students_code BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.generate_student_code();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id)
);
CREATE INDEX idx_student_subjects_center ON public.student_subjects(center_id);
CREATE INDEX idx_student_subjects_student ON public.student_subjects(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_subjects TO authenticated;
GRANT ALL ON public.student_subjects TO service_role;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped student_subjects" ON public.student_subjects FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_student_subjects_updated BEFORE UPDATE ON public.student_subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.progress_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score NUMERIC(5,2),
  level TEXT,
  summary TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_progress_center ON public.progress_records(center_id);
CREATE INDEX idx_progress_student ON public.progress_records(student_id, record_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_records TO authenticated;
GRANT ALL ON public.progress_records TO service_role;
ALTER TABLE public.progress_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped progress" ON public.progress_records FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.progress_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, session_date)
);
CREATE INDEX idx_attendance_center ON public.attendance(center_id, session_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assessment_type TEXT,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  max_score NUMERIC(6,2),
  score NUMERIC(6,2),
  feedback TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessments_center ON public.assessments(center_id, assessment_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped assessments" ON public.assessments FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_assessments_updated BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT,
  period_start DATE,
  period_end DATE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_path TEXT,
  generated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_center ON public.reports(center_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped reports" ON public.reports FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.center_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL UNIQUE REFERENCES public.centers(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'USD',
  logo_url TEXT,
  primary_color TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_settings TO authenticated;
GRANT ALL ON public.center_settings TO service_role;
ALTER TABLE public.center_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped settings" ON public.center_settings FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_center_settings_updated BEFORE UPDATE ON public.center_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Center members read documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'center-documents' AND public.can_access_center(NULLIF((storage.foldername(name))[1], '')::uuid));
CREATE POLICY "Center members write documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'center-documents' AND public.can_access_center(NULLIF((storage.foldername(name))[1], '')::uuid));
CREATE POLICY "Center members delete documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'center-documents' AND public.can_access_center(NULLIF((storage.foldername(name))[1], '')::uuid));

INSERT INTO public.centers (id, name, code, email, phone, address, city, country)
VALUES ('11111111-1111-4111-8111-111111111111', 'Bright Minds Learning Center', 'BMLC', 'contact@brightminds.edu', '+1 555 0100', '120 Cedar Avenue', 'Austin', 'USA');

INSERT INTO public.center_settings (center_id, timezone, currency) VALUES ('11111111-1111-4111-8111-111111111111', 'America/Chicago', 'USD');

INSERT INTO public.subjects (id, center_id, name, code, description, level) VALUES
 ('22222222-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Mathematics','MATH','Core mathematics program','Intermediate'),
 ('22222222-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Physics','PHYS','Applied physics fundamentals','Advanced'),
 ('22222222-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','English','ENG','Reading, writing and comprehension','Beginner'),
 ('22222222-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Chemistry','CHEM','General chemistry','Intermediate'),
 ('22222222-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','Computer Science','CS','Programming foundations','Intermediate');

INSERT INTO public.teachers (id, center_id, first_name, last_name, email, phone, gender, specialization, hire_date) VALUES
 ('33333333-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Sarah','Bennett','sarah.bennett@brightminds.edu','+1 555 0111','female','Mathematics','2022-08-15'),
 ('33333333-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Daniel','Okafor','daniel.okafor@brightminds.edu','+1 555 0112','male','Physics','2021-01-10'),
 ('33333333-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Maria','Gonzalez','maria.gonzalez@brightminds.edu','+1 555 0113','female','English Literature','2023-03-01'),
 ('33333333-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Ahmed','Farouk','ahmed.farouk@brightminds.edu','+1 555 0114','male','Computer Science','2020-09-05');

INSERT INTO public.students (center_id, first_name, last_name, gender, date_of_birth, school, school_grade, phone, email, parent_name, parent_phone, registration_date, status, notes) VALUES
 ('11111111-1111-4111-8111-111111111111','Liam','Carter','male','2010-04-12','Westside High','Grade 8','+1 555 0201','liam.carter@example.com','Emma Carter','+1 555 0301','2026-01-14','active','Strong in algebra'),
 ('11111111-1111-4111-8111-111111111111','Noah','Whitfield','male','2009-11-02','Riverdale Academy','Grade 9','+1 555 0202','noah.w@example.com','James Whitfield','+1 555 0302','2026-02-03','active',NULL),
 ('11111111-1111-4111-8111-111111111111','Olivia','Hansen','female','2011-06-21','Westside High','Grade 7','+1 555 0203','olivia.h@example.com','Nina Hansen','+1 555 0303','2026-02-19','active','Needs extra reading support'),
 ('11111111-1111-4111-8111-111111111111','Ava','Mitchell','female','2010-09-30','Northgate School','Grade 8','+1 555 0204','ava.m@example.com','Robert Mitchell','+1 555 0304','2026-03-08','active',NULL),
 ('11111111-1111-4111-8111-111111111111','Ethan','Brooks','male','2008-02-17','Riverdale Academy','Grade 10','+1 555 0205','ethan.b@example.com','Laura Brooks','+1 555 0305','2026-03-27','active','Preparing for exams'),
 ('11111111-1111-4111-8111-111111111111','Sophia','Nguyen','female','2011-01-08','Northgate School','Grade 7','+1 555 0206','sophia.n@example.com','Kim Nguyen','+1 555 0306','2026-04-11','active',NULL),
 ('11111111-1111-4111-8111-111111111111','Mason','Reilly','male','2009-05-25','Westside High','Grade 9','+1 555 0207','mason.r@example.com','Peter Reilly','+1 555 0307','2026-04-29','inactive','Paused enrollment'),
 ('11111111-1111-4111-8111-111111111111','Isabella','Ferreira','female','2010-12-14','Greenwood Prep','Grade 8','+1 555 0208','bella.f@example.com','Carla Ferreira','+1 555 0308','2026-05-16','active',NULL),
 ('11111111-1111-4111-8111-111111111111','Lucas','Novak','male','2008-08-09','Greenwood Prep','Grade 10','+1 555 0209','lucas.n@example.com','Petra Novak','+1 555 0309','2026-06-02','active','Excellent in physics'),
 ('11111111-1111-4111-8111-111111111111','Mia','Thompson','female','2011-03-19','Northgate School','Grade 7','+1 555 0210','mia.t@example.com','Grace Thompson','+1 555 0310','2026-06-24','active',NULL),
 ('11111111-1111-4111-8111-111111111111','James','Alvarez','male','2009-07-07','Westside High','Grade 9','+1 555 0211','james.a@example.com','Diego Alvarez','+1 555 0311','2026-07-09','active',NULL),
 ('11111111-1111-4111-8111-111111111111','Amelia','Okonkwo','female','2010-10-28','Riverdale Academy','Grade 8','+1 555 0212','amelia.o@example.com','Chidi Okonkwo','+1 555 0312','2026-07-25','active','Joined summer program'),
 ('11111111-1111-4111-8111-111111111111','Henry','Lindqvist','male','2008-12-05','Greenwood Prep','Grade 10','+1 555 0213','henry.l@example.com','Anna Lindqvist','+1 555 0313','2026-07-28','active',NULL),
 ('11111111-1111-4111-8111-111111111111','Charlotte','Dubois','female','2011-09-16','Northgate School','Grade 7','+1 555 0214','charlotte.d@example.com','Marc Dubois','+1 555 0314','2026-07-30','active',NULL);

INSERT INTO public.student_subjects (center_id, student_id, subject_id, teacher_id)
SELECT s.center_id, s.id, '22222222-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001' FROM public.students s;
INSERT INTO public.student_subjects (center_id, student_id, subject_id, teacher_id)
SELECT s.center_id, s.id, '22222222-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000003' FROM public.students s WHERE s.school_grade IN ('Grade 7','Grade 8');
