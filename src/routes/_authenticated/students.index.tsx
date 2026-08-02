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
import { useAuth } from "@/hooks/useAuth";
import {
  centersQuery,
  formatDate,
  fullName,
  gradesQuery,
  studentsQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import type { Student, StudentStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/students/")({
  head: () => ({
    meta: [
      { title: "Students — Center Management System" },
      { name: "description", content: "Browse and search every student registered at your center." },
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
  const { centerId: myCenterId, isSuperAdmin } = useAuth();
  const students = useQuery(studentsQuery);
  const centers = useQuery(centersQuery);
  const grades = useQuery(gradesQuery);
  const crud = useCrud("students", "Student");

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const defaultCenter = myCenterId ?? centers.data?.[0]?.id ?? "";
  const [form, setForm] = useState<StudentForm>(() => emptyForm(""));

  const gradeName = (id: string | null) =>
    grades.data?.find((grade) => grade.id === id)?.name ?? "—";
  const centerName = (id: string) =>
    centers.data?.find((center) => center.id === id)?.name ?? "—";

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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(defaultCenter));
    setOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
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
    const ok = editing
      ? await crud.update(editing.id, payload, `Student ${label} updated`)
      : await crud.create(payload, `Student ${label} registered`);
    if (ok) setOpen(false);
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
                          to="/students/$studentId"
                          params={{ studentId: student.id }}
                          className="hover:underline"
                        >
                          {fullName(student)}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {student.email ?? "—"}
                      </TableCell>
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
                            <Link to="/students/$studentId" params={{ studentId: student.id }}>
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
                                variant="destructive"
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
          <Field label="Center">
            <SelectField
              value={form.center_id}
              onChange={(value) => setForm({ ...form, center_id: value, grade_id: "" })}
              placeholder="Select center"
              options={centerOptions}
            />
          </Field>
          <Field label="Grade / Class">
            <SelectField
              value={form.grade_id}
              onChange={(value) => setForm({ ...form, grade_id: value })}
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
      </FormDialog>
    </>
  );
}
