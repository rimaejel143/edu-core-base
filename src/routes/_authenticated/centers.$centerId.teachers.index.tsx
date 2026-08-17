import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  centersQuery,
  formatDate,
  fullName,
  gradesQuery,
  subjectGradesQuery,
  subjectsQuery,
  teacherSubjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import type { RecordStatus, Teacher } from "@/lib/types";
import { useScopeId, useWorkspaceCenterId } from "@/hooks/useCenterScope";

export const Route = createFileRoute("/_authenticated/centers/$centerId/teachers/")({
  head: () => ({
    meta: [
      { title: "Teachers — Center Management System" },
      { name: "description", content: "Manage the teaching staff registered at your center." },
      { property: "og:title", content: "Teachers — Center Management System" },
      {
        property: "og:description",
        content: "Manage the teaching staff registered at your center.",
      },
    ],
  }),
  component: TeachersPage,
});

const STATUS_OPTIONS: { value: RecordStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

interface TeacherForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  specialization: string;
  hire_date: string;
  center_id: string;
  status: RecordStatus;
}

const today = () => new Date().toISOString().slice(0, 10);
const pairKey = (gradeId: string, subjectId: string) => `${gradeId}:${subjectId}`;

function TeachersPage() {
  const centerId = useWorkspaceCenterId() ?? "";
  const scopeId = useScopeId();
  const teachers = useQuery(teachersQuery(scopeId));
  const centers = useQuery(centersQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const grades = useQuery(gradesQuery(scopeId));
  const subjectGrades = useQuery(subjectGradesQuery(scopeId));
  const links = useQuery(teacherSubjectsQuery(scopeId));
  const crud = useCrud("teachers", "Teacher");

  const defaultCenter = centerId;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specialization: "",
    hire_date: today(),
    center_id: "",
    status: "active",
  });
  // Assignments are teacher + grade + subject triples, edited inline with the teacher.
  const [pairs, setPairs] = useState<string[]>([]);

  const centerName = (id: string) =>
    centers.data?.find((center) => center.id === id)?.name ?? "—";

  const formCenter = form.center_id || defaultCenter;

  const formGrades = useMemo(
    () => (grades.data ?? []).filter((grade) => grade.center_id === formCenter),
    [grades.data, formCenter],
  );

  const subjectsForGrade = (gradeId: string) => {
    const linked = (subjectGrades.data ?? [])
      .filter((row) => row.grade_id === gradeId)
      .map((row) => row.subject_id);
    const pool = (subjects.data ?? []).filter((subject) => subject.center_id === formCenter);
    return linked.length > 0 ? pool.filter((subject) => linked.includes(subject.id)) : pool;
  };

  const summaryFor = (teacherId: string) => {
    const rows = (links.data ?? []).filter((link) => link.teacher_id === teacherId);
    return rows
      .map((row) => {
        const subject = subjects.data?.find((item) => item.id === row.subject_id)?.name;
        const grade = grades.data?.find((item) => item.id === row.grade_id)?.name;
        return subject ? (grade ? `${subject} (${grade})` : subject) : "";
      })
      .filter(Boolean);
  };

  const openCreate = () => {
    setEditing(null);
    setPairs([]);
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      specialization: "",
      hire_date: today(),
      center_id: defaultCenter,
      status: "active",
    });
    setOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher);
    setPairs(
      (links.data ?? [])
        .filter((link) => link.teacher_id === teacher.id && link.grade_id)
        .map((link) => pairKey(link.grade_id as string, link.subject_id)),
    );
    setForm({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email ?? "",
      phone: teacher.phone ?? "",
      specialization: teacher.specialization ?? "",
      hire_date: teacher.hire_date?.slice(0, 10) ?? today(),
      center_id: teacher.center_id,
      status: teacher.status,
    });
    setOpen(true);
  };

  const syncAssignments = async (teacherId: string, teacherCenter: string) => {
    const current = (links.data ?? []).filter((link) => link.teacher_id === teacherId);
    const keep = new Set(pairs);
    const toRemove = current.filter(
      (link) => !link.grade_id || !keep.has(pairKey(link.grade_id, link.subject_id)),
    );
    const existing = new Set(
      current
        .filter((link) => link.grade_id)
        .map((link) => pairKey(link.grade_id as string, link.subject_id)),
    );
    const toAdd = pairs.filter((key) => !existing.has(key));

    for (const link of toRemove) {
      await supabase.from("teacher_subjects").delete().eq("id", link.id);
    }
    if (toAdd.length > 0) {
      await supabase.from("teacher_subjects").insert(
        toAdd.map((key) => {
          const [gradeId, subjectId] = key.split(":") as [string, string];
          return {
            center_id: teacherCenter,
            teacher_id: teacherId,
            grade_id: gradeId,
            subject_id: subjectId,
          };
        }),
      );
    }
    await links.refetch();
  };

  const submit = async () => {
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      specialization: form.specialization.trim() || null,
      hire_date: form.hire_date,
      center_id: formCenter,
      status: form.status,
    };
    const label = `${payload.first_name} ${payload.last_name}`.trim();

    if (editing) {
      const ok = await crud.update(editing.id, payload, `Teacher ${label} updated`);
      if (!ok) return;
      await syncAssignments(editing.id, formCenter);
      setOpen(false);
      return;
    }

    const created = await crud.create(payload, `Teacher ${label} added`);
    if (!created) return;
    const { data: row } = await supabase
      .from("teachers")
      .select("id")
      .eq("center_id", formCenter)
      .eq("first_name", payload.first_name)
      .eq("last_name", payload.last_name)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row?.id && pairs.length > 0) await syncAssignments(row.id, formCenter);
    setOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Teaching staff assigned to your center."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add teacher
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {teachers.isLoading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (teachers.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No teachers yet"
                description="Add your first teacher to start assigning subjects."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Specialization</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Center</TableHead>
                    <TableHead className="hidden xl:table-cell">Assignments</TableHead>
                    <TableHead className="hidden lg:table-cell">Hired</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(teachers.data ?? []).map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/centers/$centerId/teachers/$teacherId"
                          params={{ centerId, teacherId: teacher.id }}
                          className="hover:underline"
                        >
                          {fullName(teacher)}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {teacher.specialization ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {teacher.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {centerName(teacher.center_id)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {summaryFor(teacher.id).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(teacher.hire_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={teacher.status === "active" ? "default" : "secondary"}>
                          {teacher.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions>
                          <ActionItem asChild>
                            <Link to="/centers/$centerId/teachers/$teacherId" params={{ centerId, teacherId: teacher.id }}>
                              <Eye className="size-4" /> View profile
                            </Link>
                          </ActionItem>
                          <ActionItem onSelect={() => openEdit(teacher)}>
                            <Pencil className="size-4" /> Edit
                          </ActionItem>
                          <ConfirmDelete
                            title="Delete teacher?"
                            description={`${fullName(teacher)} will be permanently removed.`}
                            onConfirm={() => {
                              void crud.remove(
                                teacher.id,
                                teacher.center_id,
                                `Teacher ${fullName(teacher)} deleted`,
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
        title={editing ? "Edit teacher" : "Add teacher"}
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
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
          <Field label="Specialization">
            <Input
              value={form.specialization}
              onChange={(event) => setForm({ ...form, specialization: event.target.value })}
            />
          </Field>
          <Field label="Hire date">
            <Input
              type="date"
              value={form.hire_date}
              onChange={(event) => setForm({ ...form, hire_date: event.target.value })}
            />
          </Field>
          <Field label="Status">
            <SelectField
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value as RecordStatus })}
              options={STATUS_OPTIONS}
            />
          </Field>
        </FieldGrid>

        <div className="mt-2 space-y-3 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Assignments</p>
            <p className="text-xs text-muted-foreground">
              Pick the subjects this teacher teaches in each grade.
            </p>
          </div>
          {formGrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Create grades first.</p>
          ) : (
            <div className="space-y-3">
              {formGrades.map((grade) => {
                const options = subjectsForGrade(grade.id);
                return (
                  <div key={grade.id}>
                    <p className="mb-1.5 text-sm font-medium">{grade.name}</p>
                    {options.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No subjects for this grade.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {options.map((subject) => {
                          const key = pairKey(grade.id, subject.id);
                          return (
                            <label key={key} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={pairs.includes(key)}
                                onCheckedChange={(checked) =>
                                  setPairs((current) =>
                                    checked
                                      ? [...current, key]
                                      : current.filter((item) => item !== key),
                                  )
                                }
                              />
                              {subject.name}
                            </label>
                          );
                        })}
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
