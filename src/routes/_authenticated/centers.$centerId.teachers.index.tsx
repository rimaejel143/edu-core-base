import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Eye, Pencil, Plus, Trash2 } from "lucide-react";

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
import { useScopeId, useWorkspaceCenterId } from "@/hooks/useCenterScope";
import {
  centersQuery,
  formatDate,
  fullName,
  gradesQuery,
  subjectsQuery,
  teacherSubjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import type { RecordStatus, Teacher } from "@/lib/types";

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

function TeachersPage() {
  const centerId = useWorkspaceCenterId() ?? "";
  const scopeId = useScopeId();
  const teachers = useQuery(teachersQuery(scopeId));
  const centers = useQuery(centersQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const grades = useQuery(gradesQuery(scopeId));
  const links = useQuery(teacherSubjectsQuery(scopeId));
  const crud = useCrud("teachers", "Teacher");
  const linkCrud = useCrud("teacher_subjects", "Assignment");

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

  const [assignFor, setAssignFor] = useState<Teacher | null>(null);
  const [assignSubjects, setAssignSubjects] = useState<string[]>([]);
  const [assignGrade, setAssignGrade] = useState("");

  const centerName = (id: string) =>
    centers.data?.find((center) => center.id === id)?.name ?? "—";

  const subjectsFor = (teacherId: string) =>
    (links.data ?? [])
      .filter((link) => link.teacher_id === teacherId)
      .map(
        (link) => subjects.data?.find((subject) => subject.id === link.subject_id)?.name ?? "",
      )
      .filter(Boolean);

  const openCreate = () => {
    setEditing(null);
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

  const submit = async () => {
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      specialization: form.specialization.trim() || null,
      hire_date: form.hire_date,
      center_id: form.center_id,
      status: form.status,
    };
    const label = `${payload.first_name} ${payload.last_name}`.trim();
    const ok = editing
      ? await crud.update(editing.id, payload, `Teacher ${label} updated`)
      : await crud.create(payload, `Teacher ${label} added`);
    if (ok) setOpen(false);
  };

  const openAssign = (teacher: Teacher) => {
    setAssignFor(teacher);
    setAssignGrade("");
    setAssignSubjects(
      (links.data ?? [])
        .filter((link) => link.teacher_id === teacher.id)
        .map((link) => link.subject_id),
    );
  };

  const saveAssignments = async () => {
    if (!assignFor) return;
    const current = (links.data ?? []).filter((link) => link.teacher_id === assignFor.id);
    const toRemove = current.filter((link) => !assignSubjects.includes(link.subject_id));
    const toAdd = assignSubjects.filter(
      (subjectId) => !current.some((link) => link.subject_id === subjectId),
    );

    for (const link of toRemove) {
      await supabase.from("teacher_subjects").delete().eq("id", link.id);
    }
    if (toAdd.length > 0) {
      await linkCrud.create(
        {
          center_id: assignFor.center_id,
          teacher_id: assignFor.id,
          subject_id: toAdd[0],
          grade_id: assignGrade || null,
        },
        `${fullName(assignFor)} assigned to subjects`,
      );
      for (const subjectId of toAdd.slice(1)) {
        await supabase.from("teacher_subjects").insert({
          center_id: assignFor.center_id,
          teacher_id: assignFor.id,
          subject_id: subjectId,
          grade_id: assignGrade || null,
        });
      }
    }
    setAssignFor(null);
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
                    <TableHead className="hidden xl:table-cell">Subjects</TableHead>
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
                        {subjectsFor(teacher.id).join(", ") || "—"}
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
                          <ActionItem onSelect={() => openAssign(teacher)}>
                            <BookOpen className="size-4" /> Assign subjects
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
      </FormDialog>

      <FormDialog
        open={Boolean(assignFor)}
        onOpenChange={(next) => !next && setAssignFor(null)}
        title={assignFor ? `Assign subjects — ${fullName(assignFor)}` : "Assign subjects"}
        description="Select every subject this teacher teaches."
        pending={linkCrud.pending}
        onSubmit={saveAssignments}
      >
        <Field label="Grade / Class (optional)">
          <SelectField
            value={assignGrade}
            onChange={setAssignGrade}
            placeholder="Any grade"
            allowEmpty
            emptyLabel="Any grade"
            options={(grades.data ?? [])
              .filter((grade) => !assignFor || grade.center_id === assignFor.center_id)
              .map((grade) => ({ value: grade.id, label: grade.name }))}
          />
        </Field>
        <div className="space-y-2">
          {(subjects.data ?? [])
            .filter((subject) => !assignFor || subject.center_id === assignFor.center_id)
            .map((subject) => (
              <label key={subject.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={assignSubjects.includes(subject.id)}
                  onCheckedChange={(checked) =>
                    setAssignSubjects((current) =>
                      checked
                        ? [...current, subject.id]
                        : current.filter((id) => id !== subject.id),
                    )
                  }
                />
                {subject.name}
              </label>
            ))}
          {(subjects.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Create subjects first.</p>
          )}
        </div>
      </FormDialog>
    </>
  );
}
