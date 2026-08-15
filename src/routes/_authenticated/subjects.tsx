import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  centersQuery,
  gradesQuery,
  studentsQuery,
  subjectGradesQuery,
  subjectsQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import type { Grade, RecordStatus, Subject } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects & Grades — Center Management System" },
      { name: "description", content: "Grades, classes and subjects offered by your center." },
      { property: "og:title", content: "Subjects & Grades — Center Management System" },
      {
        property: "og:description",
        content: "Grades, classes and subjects offered by your center.",
      },
    ],
  }),
  component: SubjectsPage,
});

const STATUS_OPTIONS: { value: RecordStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

function SubjectsPage() {
  const { centerId: myCenterId } = useAuth();
  const subjects = useQuery(subjectsQuery);
  const grades = useQuery(gradesQuery);
  const centers = useQuery(centersQuery);
  const students = useQuery(studentsQuery);
  const subjectGrades = useQuery(subjectGradesQuery);
  const subjectCrud = useCrud("subjects", "Subject");
  const gradeCrud = useCrud("grades", "Grade");

  const defaultCenter = myCenterId ?? centers.data?.[0]?.id ?? "";

  const [gradeOpen, setGradeOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeForm, setGradeForm] = useState({
    name: "",
    level_order: "",
    center_id: "",
    status: "active" as RecordStatus,
  });

  const [subjectOpen, setSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    level: "",
    description: "",
    center_id: "",
    status: "active" as RecordStatus,
  });
  const [linkedGrades, setLinkedGrades] = useState<string[]>([]);

  const centerName = (id: string) =>
    centers.data?.find((center) => center.id === id)?.name ?? "—";
  const centerOptions = (centers.data ?? []).map((center) => ({
    value: center.id,
    label: center.name,
  }));

  const gradesForSubject = (subjectId: string) =>
    (subjectGrades.data ?? [])
      .filter((row) => row.subject_id === subjectId)
      .map((row) => grades.data?.find((grade) => grade.id === row.grade_id)?.name ?? "")
      .filter(Boolean);

  const studentsInGrade = (gradeId: string) =>
    (students.data ?? []).filter((student) => student.grade_id === gradeId).length;

  const openGradeCreate = () => {
    setEditingGrade(null);
    setGradeForm({ name: "", level_order: "", center_id: defaultCenter, status: "active" });
    setGradeOpen(true);
  };

  const openGradeEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setGradeForm({
      name: grade.name,
      level_order: grade.level_order === null ? "" : String(grade.level_order),
      center_id: grade.center_id,
      status: grade.status,
    });
    setGradeOpen(true);
  };

  const submitGrade = async () => {
    const payload = {
      name: gradeForm.name.trim(),
      level_order: gradeForm.level_order ? Number(gradeForm.level_order) : null,
      center_id: gradeForm.center_id,
      status: gradeForm.status,
    };
    const ok = editingGrade
      ? await gradeCrud.update(editingGrade.id, payload, `Grade ${payload.name} updated`)
      : await gradeCrud.create(payload, `Grade ${payload.name} created`);
    if (ok) setGradeOpen(false);
  };

  const openSubjectCreate = () => {
    setEditingSubject(null);
    setSubjectForm({
      name: "",
      code: "",
      level: "",
      description: "",
      center_id: defaultCenter,
      status: "active",
    });
    setLinkedGrades([]);
    setSubjectOpen(true);
  };

  const openSubjectEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      code: subject.code ?? "",
      level: subject.level ?? "",
      description: subject.description ?? "",
      center_id: subject.center_id,
      status: subject.status,
    });
    setLinkedGrades(
      (subjectGrades.data ?? [])
        .filter((row) => row.subject_id === subject.id)
        .map((row) => row.grade_id),
    );
    setSubjectOpen(true);
  };

  const syncSubjectGrades = async (subjectId: string, centerId: string) => {
    const current = (subjectGrades.data ?? []).filter((row) => row.subject_id === subjectId);
    for (const row of current.filter((item) => !linkedGrades.includes(item.grade_id))) {
      await supabase.from("subject_grades").delete().eq("id", row.id);
    }
    const toAdd = linkedGrades.filter(
      (gradeId) => !current.some((row) => row.grade_id === gradeId),
    );
    if (toAdd.length > 0) {
      await supabase.from("subject_grades").insert(
        toAdd.map((gradeId) => ({
          center_id: centerId,
          subject_id: subjectId,
          grade_id: gradeId,
        })),
      );
    }
  };

  const submitSubject = async () => {
    const payload = {
      name: subjectForm.name.trim(),
      code: subjectForm.code.trim() || null,
      level: subjectForm.level.trim() || null,
      description: subjectForm.description.trim() || null,
      center_id: subjectForm.center_id,
      status: subjectForm.status,
    };

    if (editingSubject) {
      const ok = await subjectCrud.update(
        editingSubject.id,
        payload,
        `Subject ${payload.name} updated`,
      );
      if (!ok) return;
      await syncSubjectGrades(editingSubject.id, payload.center_id);
    } else {
      const created = await subjectCrud.create(payload, `Subject ${payload.name} created`);
      if (!created?.id) return;
      await syncSubjectGrades(created.id, payload.center_id);
    }
    setSubjectOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Subjects & Grades"
        description="Academic structure: centers hold grades, grades hold subjects, subjects hold students."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openGradeCreate}>
              <Plus className="size-4" /> Add grade
            </Button>
            <Button onClick={openSubjectCreate}>
              <Plus className="size-4" /> Add subject
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="size-4" /> Grades / Classes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {grades.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (grades.data ?? []).length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              No grades yet — create Grade 7, Grade 8 and so on to structure your center.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(grades.data ?? []).map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-4"
                >
                  <div className="min-w-0">
                    <Link
                      to="/classes/$gradeId"
                      params={{ gradeId: grade.id }}
                      className="font-display text-sm font-semibold hover:underline"
                    >
                      {grade.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {centerName(grade.center_id)} · {studentsInGrade(grade.id)} students
                    </p>
                  </div>
                  <RowActions>
                    <ActionItem onSelect={() => openGradeEdit(grade)}>
                      <Pencil className="size-4" /> Edit
                    </ActionItem>
                    <ConfirmDelete
                      title="Delete grade?"
                      description={`${grade.name} will be removed and unlinked from its students and subjects.`}
                      onConfirm={() => {
                        void gradeCrud.remove(
                          grade.id,
                          grade.center_id,
                          `Grade ${grade.name} deleted`,
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {subjects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (subjects.data ?? []).length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Create your first subject and assign it to one or more grades."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(subjects.data ?? []).map((subject) => (
            <Card key={subject.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold">{subject.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {subject.code ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={subject.status === "active" ? "default" : "secondary"}>
                      {subject.status}
                    </Badge>
                    <RowActions>
                      <ActionItem onSelect={() => openSubjectEdit(subject)}>
                        <Pencil className="size-4" /> Edit
                      </ActionItem>
                      <ConfirmDelete
                        title="Delete subject?"
                        description={`${subject.name} and its grade assignments will be removed.`}
                        onConfirm={() => {
                          void subjectCrud.remove(
                            subject.id,
                            subject.center_id,
                            `Subject ${subject.name} deleted`,
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
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {subject.description ?? "No description provided."}
                </p>
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  Grades: {gradesForSubject(subject.id).join(", ") || "Not assigned"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {centerName(subject.center_id)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormDialog
        open={gradeOpen}
        onOpenChange={setGradeOpen}
        title={editingGrade ? "Edit grade" : "Add grade"}
        pending={gradeCrud.pending}
        onSubmit={submitGrade}
      >
        <FieldGrid>
          <Field label="Name" hint="For example Grade 8">
            <Input
              required
              value={gradeForm.name}
              onChange={(event) => setGradeForm({ ...gradeForm, name: event.target.value })}
            />
          </Field>
          <Field label="Order (optional)">
            <Input
              type="number"
              value={gradeForm.level_order}
              onChange={(event) =>
                setGradeForm({ ...gradeForm, level_order: event.target.value })
              }
            />
          </Field>
          <Field label="Center">
            <SelectField
              value={gradeForm.center_id}
              onChange={(value) => setGradeForm({ ...gradeForm, center_id: value })}
              placeholder="Select center"
              options={centerOptions}
            />
          </Field>
          <Field label="Status">
            <SelectField
              value={gradeForm.status}
              onChange={(value) =>
                setGradeForm({ ...gradeForm, status: value as RecordStatus })
              }
              options={STATUS_OPTIONS}
            />
          </Field>
        </FieldGrid>
      </FormDialog>

      <FormDialog
        open={subjectOpen}
        onOpenChange={setSubjectOpen}
        wide
        title={editingSubject ? "Edit subject" : "Add subject"}
        pending={subjectCrud.pending}
        onSubmit={submitSubject}
      >
        <FieldGrid>
          <Field label="Name">
            <Input
              required
              value={subjectForm.name}
              onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })}
            />
          </Field>
          <Field label="Code">
            <Input
              value={subjectForm.code}
              onChange={(event) => setSubjectForm({ ...subjectForm, code: event.target.value })}
            />
          </Field>
          <Field label="Level">
            <Input
              value={subjectForm.level}
              onChange={(event) => setSubjectForm({ ...subjectForm, level: event.target.value })}
            />
          </Field>
          <Field label="Center">
            <SelectField
              value={subjectForm.center_id}
              onChange={(value) => setSubjectForm({ ...subjectForm, center_id: value })}
              placeholder="Select center"
              options={centerOptions}
            />
          </Field>
          <Field label="Status">
            <SelectField
              value={subjectForm.status}
              onChange={(value) =>
                setSubjectForm({ ...subjectForm, status: value as RecordStatus })
              }
              options={STATUS_OPTIONS}
            />
          </Field>
        </FieldGrid>
        <Field label="Description">
          <Textarea
            rows={3}
            value={subjectForm.description}
            onChange={(event) =>
              setSubjectForm({ ...subjectForm, description: event.target.value })
            }
          />
        </Field>
        <Field label="Assigned grades">
          <div className="space-y-2 rounded-lg border border-border p-3">
            {(grades.data ?? [])
              .filter((grade) => grade.center_id === subjectForm.center_id)
              .map((grade) => (
                <label key={grade.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={linkedGrades.includes(grade.id)}
                    onCheckedChange={(checked) =>
                      setLinkedGrades((current) =>
                        checked
                          ? [...current, grade.id]
                          : current.filter((id) => id !== grade.id),
                      )
                    }
                  />
                  {grade.name}
                </label>
              ))}
            {(grades.data ?? []).filter((grade) => grade.center_id === subjectForm.center_id)
              .length === 0 && (
              <p className="text-sm text-muted-foreground">
                No grades in this center yet — add one first.
              </p>
            )}
          </div>
        </Field>
      </FormDialog>
    </>
  );
}
