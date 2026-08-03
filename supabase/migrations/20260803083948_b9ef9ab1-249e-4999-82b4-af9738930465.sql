
ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone TEXT;

CREATE SEQUENCE IF NOT EXISTS public.teacher_number_seq;

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS teacher_code TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

CREATE OR REPLACE FUNCTION public.generate_teacher_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.teacher_code IS NULL OR NEW.teacher_code = '' THEN
    NEW.teacher_code := 'TC-' || lpad(nextval('public.teacher_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_teacher_code ON public.teachers;
CREATE TRIGGER set_teacher_code
  BEFORE INSERT ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.generate_teacher_code();

DROP TRIGGER IF EXISTS set_student_code ON public.students;
CREATE TRIGGER set_student_code
  BEFORE INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.generate_student_code();

UPDATE public.teachers
SET teacher_code = 'TC-' || lpad(nextval('public.teacher_number_seq')::TEXT, 5, '0')
WHERE teacher_code IS NULL;

ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS room TEXT,
  ADD COLUMN IF NOT EXISTS capacity INTEGER;
