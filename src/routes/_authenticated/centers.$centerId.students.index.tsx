import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/common/DataDisplay";
import {
  ActionItem,
  ConfirmDelete,
  Field,
  FieldGrid,
  FormDialog,
  RowActions,
  SelectField,
} from "@/components/common/FormKit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  centersQuery,
  formatDate,
  fullName,
  gradesQuery,
  studentSubjectsQuery,
  studentsQuery,
  subjectGradesQuery,
  subjectsQuery,
  teacherSubjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import type { Student, StudentStatus } from "@/lib/types";
import { useScopeId, useWorkspaceCenterId } from "@/hooks/useCenterScope";

export const Route = createFileRoute("/_authenticated/centers/$centerId/students/")({
  head: () => ({
    meta: [
      { title: "Students — Center Management System" },
      {
        name: "description",
        content: "Browse and search every student registered at your center.",
      },
      { property: "og:title", content: "Students — Center Management System" },
      {
        property: "og:description",
        content: "Browse and search every student registered at your center.",
      },
    ],
  }),
  component: StudentsPage,
});

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
  { value: "suspended", label: "Suspended" },
];

interface StudentForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  center_id: string;
  grade_id: string;
  school: string;
  parent_name: string;
  parent_phone: string;
  registration_date: string;
  status: StudentStatus;
}

const today = () => new Date().toISOString().slice(0, 10);

function emptyForm(centerId: string): StudentForm {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    center_id: centerId,
    grade_id: "",
    school: "",
    parent_name: "",
    parent_phone: "",
    registration_date: today(),
    status: "active",
  };
}

function StudentsPage() {
  const { isSuperAdmin } = useAuth();
  const centerId = useWorkspaceCenterId() ?? "";
  const scopeId = useScopeId();
  const students = useQuery(studentsQuery(scopeId));
  const centers = useQuery(centersQuery(scopeId));
  const grades = useQuery(gradesQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const subjectGrades = useQuery(subjectGradesQuery(scopeId));
  const teachers = useQuery(teachersQuery(scopeId));
  const assignments = useQuery(teacherSubjectsQuery(scopeId));
  const enrolments = useQuery(studentSubjectsQuery(scopeId));
  const crud = useCrud("students", "Student");

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const defaultCenter = centerId;
  const [form, setForm] = useState<StudentForm>(() => emptyForm(""));
  // subject id -> teacher id ("" = no teacher chosen yet)
  const [enrol, setEnrol] = useState<Record<string, string>>({});

  const gradeName = (id: string | null) =>
    grades.data?.find((grade) => grade.id === id)?.name ?? "—";
  const centerName = (id: string) => centers.data?.find((center) => center.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (students.data ?? []).filter((student) => {
      if (gradeFilter && student.grade_id !== gradeFilter) return false;
      if (centerFilter && student.center_id !== centerFilter) return false;
      if (statusFilter && student.status !== statusFilter) return false;
      if (!term) return true;
      return [
        student.student_code,
        fullName(student),
        student.email,
        student.phone,
        gradeName(student.grade_id),
        student.school_grade,
        centerName(student.center_id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.data, search, gradeFilter, centerFilter, statusFilter, grades.data, centers.data]);

  // Subjects available in the selected grade: linked to the grade, or taught there.
  const gradeSubjects = useMemo(() => {
    if (!form.grade_id) return [];
    const ids = new Set<string>([
      ...(subjectGrades.data ?? [])
        .filter((row) => row.grade_id === form.grade_id)
        .map((row) => row.subject_id),
      ...(assignments.data ?? [])
        .filter((row) => row.grade_id === form.grade_id)
        .map((row) => row.subject_id),
    ]);
    return (subjects.data ?? []).filter((subject) => ids.has(subject.id));
  }, [form.grade_id, subjectGrades.data, assignments.data, subjects.data]);

  const teachersFor = (subjectId: string) =>
    (assignments.data ?? [])
      .filter((row) => row.subject_id === subjectId && row.grade_id === form.grade_id)
      .map((row) => {
        const teacher = teachers.data?.find((item) => item.id === row.teacher_id);
        return teacher ? { value: teacher.id, label: fullName(teacher) } : null;
      })
      .filter((option): option is { value: string; label: string } => option !== null);

  const openCreate = () => {
    setEditing(null);
    setEnrol({});
    setForm(emptyForm(defaultCenter));
    setOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
    const current: Record<string, string> = {};
    for (const row of enrolments.data ?? []) {
      if (row.student_id === student.id) current[row.subject_id] = row.teacher_id ?? "";
    }
    setEnrol(current);
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email ?? "",
      phone: student.phone ?? "",
      date_of_birth: student.date_of_birth ?? "",
      center_id: student.center_id,
      grade_id: student.grade_id ?? "",
      school: student.school ?? "",
      parent_name: student.parent_name ?? "",
      parent_phone: student.parent_phone ?? "",
      registration_date: student.registration_date?.slice(0, 10) ?? today(),
      status: student.status,
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      date_of_birth: form.date_of_birth || null,
      center_id: form.center_id,
      grade_id: form.grade_id || null,
      school: form.school.trim() || null,
      parent_name: form.parent_name.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      registration_date: form.registration_date,
      status: form.status,
    };
    const label = `${payload.first_name} ${payload.last_name}`.trim();

    if (editing) {
      const ok = await crud.update(editing.id, payload, `Student ${label} updated`);
      if (!ok) return;
      await syncEnrolments(editing.id, payload.center_id);
      setOpen(false);
      return;
    }

    const created = await crud.create(payload, `Student ${label} registered`);
    if (!created) return;
    const { data: row } = await supabase
      .from("students")
      .select("id")
      .eq("center_id", payload.center_id)
      .eq("first_name", payload.first_name)
      .eq("last_name", payload.last_name)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.id) await syncEnrolments(row.id, payload.center_id);
    setOpen(false);
  };

  const syncEnrolments = async (studentId: string, studentCenter: string) => {
    const current = (enrolments.data ?? []).filter((row) => row.student_id === studentId);
    const selected = Object.keys(enrol);

    for (const row of current) {
      if (!selected.includes(row.subject_id)) {
        await supabase.from("student_subjects").delete().eq("id", row.id);
      }
    }
    for (const subjectId of selected) {
      const existing = current.find((row) => row.subject_id === subjectId);
      const teacherId = enrol[subjectId] || null;
      if (existing) {
        await supabase
          .from("student_subjects")
          .update({ teacher_id: teacherId, grade_id: form.grade_id || null })
          .eq("id", existing.id);
      } else {
        await supabase.from("student_subjects").insert({
          center_id: studentCenter,
          student_id: studentId,
          subject_id: subjectId,
          teacher_id: teacherId,
          grade_id: form.grade_id || null,
        });
      }
    }
    await enrolments.refetch();
  };

  const centerOptions = (centers.data ?? []).map((center) => ({
    value: center.id,
    label: center.name,
  }));
  const gradeOptions = (grades.data ?? [])
    .filter((grade) => !form.center_id || grade.center_id === form.center_id)
    .map((grade) => ({ value: grade.id, label: grade.name }));

  return (
    <>
      <PageHeader
        title="Students"
        description="Every student record belonging to your center."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add student
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID, name, email, grade or center"
              className="pl-9"
              aria-label="Search students"
            />
          </div>
          <div className="w-40">
            <SelectField
              value={gradeFilter}
              onChange={setGradeFilter}
              placeholder="All grades"
              allowEmpty
              emptyLabel="All grades"
              options={(grades.data ?? []).map((grade) => ({
                value: grade.id,
                label: grade.name,
              }))}
            />
          </div>
          {isSuperAdmin && (
            <div className="w-44">
              <SelectField
                value={centerFilter}
                onChange={setCenterFilter}
                placeholder="All centers"
                allowEmpty
                emptyLabel="All centers"
                options={centerOptions}
              />
            </div>
          )}
          <div className="w-36">
            <SelectField
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All statuses"
              allowEmpty
              emptyLabel="All statuses"
              options={STATUS_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {students.isLoading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No students found"
                description="Adjust your filters, or add your first student record."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Grade</TableHead>
                    <TableHead className="hidden lg:table-cell">Center</TableHead>
                    <TableHead className="hidden lg:table-cell">Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-xs">{student.student_code}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          to="/centers/$centerId/students/$studentId"
                          params={{ centerId, studentId: student.id }}
                          className="hover:underline"
                        >
                          {fullName(student)}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{student.email ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {gradeName(student.grade_id)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {centerName(student.center_id)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(student.registration_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.status === "active" ? "default" : "secondary"}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions>
                          <ActionItem asChild>
                            <Link
                              to="/centers/$centerId/students/$studentId"
                              params={{ centerId, studentId: student.id }}
                            >
                              <Eye className="size-4" /> View details
                            </Link>
                          </ActionItem>
                          <ActionItem onSelect={() => openEdit(student)}>
                            <Pencil className="size-4" /> Edit
                          </ActionItem>
                          <ConfirmDelete
                            title="Delete student?"
                            description={`${fullName(student)} and all related records will be permanently removed.`}
                            onConfirm={() => {
                              void crud.remove(
                                student.id,
                                student.center_id,
                                `Student ${fullName(student)} deleted`,
                              );
                            }}
                            trigger={
                              <ActionItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(event) => event.preventDefault()}
                              >
                                <Trash2 className="size-4" /> Delete
                              </ActionItem>
                            }
                          />
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        wide
        title={editing ? "Edit student" : "Add student"}
        description={
          editing
            ? `Student ID ${editing.student_code ?? "—"}`
            : "The Student ID is generated automatically after saving."
        }
        pending={crud.pending}
        onSubmit={submit}
      >
        <FieldGrid>
          <Field label="First name">
            <Input
              required
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            />
          </Field>
          <Field label="Last name">
            <Input
              required
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>
          <Field label="Phone number">
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
          <Field label="Date of birth (optional)">
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })}
            />
          </Field>
          <Field label="Enrollment date">
            <Input
              type="date"
              required
              value={form.registration_date}
              onChange={(event) => setForm({ ...form, registration_date: event.target.value })}
            />
          </Field>
          <Field label="Grade">
            <SelectField
              value={form.grade_id}
              onChange={(value) => {
                setForm({ ...form, grade_id: value });
                setEnrol({});
              }}
              placeholder="Select grade"
              allowEmpty
              emptyLabel="Not assigned"
              options={gradeOptions}
            />
          </Field>
          <Field label="School">
            <Input
              value={form.school}
              onChange={(event) => setForm({ ...form, school: event.target.value })}
            />
          </Field>
          <Field label="Status">
            <SelectField
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value as StudentStatus })}
              options={STATUS_OPTIONS}
            />
          </Field>
          <Field label="Parent name">
            <Input
              value={form.parent_name}
              onChange={(event) => setForm({ ...form, parent_name: event.target.value })}
            />
          </Field>
          <Field label="Parent phone">
            <Input
              value={form.parent_phone}
              onChange={(event) => setForm({ ...form, parent_phone: event.target.value })}
            />
          </Field>
        </FieldGrid>

        <div className="mt-2 space-y-3 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Subjects & teachers</p>
            <p className="text-xs text-muted-foreground">
              Pick the subjects taught in this grade, then choose the assigned teacher.
            </p>
          </div>
          {!form.grade_id ? (
            <p className="text-sm text-muted-foreground">Select a grade first.</p>
          ) : gradeSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects are taught in this grade yet.
            </p>
          ) : (
            <div className="space-y-2">
              {gradeSubjects.map((subject) => {
                const checked = subject.id in enrol;
                const options = teachersFor(subject.id);
                return (
                  <div key={subject.id} className="flex flex-wrap items-center gap-3">
                    <label className="flex min-w-40 items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          setEnrol((current) => {
                            const copy = { ...current };
                            if (next) copy[subject.id] = options[0]?.value ?? "";
                            else delete copy[subject.id];
                            return copy;
                          })
                        }
                      />
                      {subject.name}
                    </label>
                    {checked && (
                      <div className="w-56">
                        <SelectField
                          value={enrol[subject.id] ?? ""}
                          onChange={(value) =>
                            setEnrol((current) => ({ ...current, [subject.id]: value }))
                          }
                          placeholder={options.length ? "Select teacher" : "No teacher assigned"}
                          allowEmpty
                          emptyLabel="Unassigned"
                          options={options}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FormDialog>
    </>
  );
}
