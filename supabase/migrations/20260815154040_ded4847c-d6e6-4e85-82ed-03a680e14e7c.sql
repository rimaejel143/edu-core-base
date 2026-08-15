CREATE TABLE public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'teacher',
  title text NOT NULL,
  body text,
  author_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO authenticated;
GRANT ALL ON public.student_notes TO service_role;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped student_notes" ON public.student_notes FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_student_notes_updated BEFORE UPDATE ON public.student_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text,
  file_path text,
  file_size integer,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_documents TO authenticated;
GRANT ALL ON public.student_documents TO service_role;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center scoped student_documents" ON public.student_documents FOR ALL TO authenticated
  USING (public.can_access_center(center_id)) WITH CHECK (public.can_access_center(center_id));
CREATE TRIGGER trg_student_documents_updated BEFORE UPDATE ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();