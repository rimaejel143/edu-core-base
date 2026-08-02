import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { EmptyState, PageHeader, StatCard } from "@/components/common/DataDisplay";
import {
  ConfirmDelete,
  Field,
  FieldGrid,
  FormDialog,
  SelectField,
} from "@/components/common/FormKit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  assessmentsQuery,
  averageScore,
  centersQuery,
  formatDate,
  fullName,
  gradesQuery,
  studentQuery,
  studentSubjectsQuery,
  subjectsQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import { BookOpen, GraduationCap, LineChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student details — Center Management System" },
      { name: "description", content: "Full profile, enrolments and results for a student." },
      { property: "og:title", content: "Student details — Center Management System" },
      {
        property: "og:description",
        content: "Full profile, enrolments and results for a student.",
      },
    ],
  }),
  component: StudentDetailPage,
});

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function StudentDetailPage() {
  const { studentId } = useParams({ from: "/_authenticated/students/$studentId" });
  const student = useQuery(studentQuery(studentId));
  const subjects = useQuery(subjectsQuery);
  const grades = useQuery(gradesQuery);
  const centers = useQuery(centersQuery);
  const enrolments = useQuery(studentSubjectsQuery);
  const assessments = useQuery(assessmentsQuery);
  const enrolCrud = useCrud("student_subjects", "Enrolment");

  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");

  const record = student.data;
  const myEnrolments = useMemo(
    () => (enrolments.data ?? []).filter((row) => row.student_id === studentId),
    [enrolments.data, studentId],
  );
  const myAssessments = useMemo(
    () => (assessments.data ?? []).filter((row) => row.student_id === studentId),
    [assessments.data, studentId],
  );

  const subjectName = (id: string | null) =>
    subjects.data?.find((subject) => subject.id === id)?.name ?? "—";

  if (student.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!record) {
    return (
      <EmptyState title="Student not found" description="This student no longer exists." />
    );
  }

  const gradeName = grades.data?.find((grade) => grade.id === record.grade_id)?.name ?? "—";
  const centerName = centers.data?.find((center) => center.id === record.center_id)?.name ?? "—";
  const average = averageScore(myAssessments);

  const addEnrolment = async () => {
    if (!subjectId) return;
    const ok = await enrolCrud.create(
      {
        center_id: record.center_id,
        student_id: record.id,
        subject_id: subjectId,
        grade_id: record.grade_id,
      },
      `${fullName(record)} enrolled in ${subjectName(subjectId)}`,
    );
    if (ok) {
      setSubjectId("");
      setOpen(false);
    }
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/students">
          <ArrowLeft className="size-4" /> Back to students
        </Link>
      </Button>

      <PageHeader
        title={fullName(record)}
        description={`Student ID ${record.student_code ?? "—"} · ${centerName}`}
        actions={
          <Badge variant={record.status === "active" ? "default" : "secondary"}>
            {record.status}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Grade / Class" value={gradeName} icon={GraduationCap} />
        <StatCard label="Subjects enrolled" value={myEnrolments.length} icon={BookOpen} />
        <StatCard label="Average score" value={average ?? "—"} icon={LineChart} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border pt-0">
            <DetailRow label="Student ID" value={record.student_code ?? "—"} />
            <DetailRow label="Email" value={record.email ?? "—"} />
            <DetailRow label="Phone" value={record.phone ?? "—"} />
            <DetailRow label="Date of birth" value={formatDate(record.date_of_birth)} />
            <DetailRow label="Enrollment date" value={formatDate(record.registration_date)} />
            <DetailRow label="Center" value={centerName} />
            <DetailRow label="Grade / Class" value={gradeName} />
            <DetailRow label="School" value={record.school ?? "—"} />
            <DetailRow label="Parent" value={record.parent_name ?? "—"} />
            <DetailRow label="Parent phone" value={record.parent_phone ?? "—"} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Enrolled subjects</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Enrol
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {myEnrolments.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No subject enrolments yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {myEnrolments.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{subjectName(row.subject_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          Enrolled {formatDate(row.enrolled_at)}
                        </p>
                      </div>
                      <ConfirmDelete
                        title="Remove enrolment?"
                        description={`${fullName(record)} will be unenrolled from ${subjectName(row.subject_id)}.`}
                        onConfirm={() => {
                          void enrolCrud.remove(
                            row.id,
                            row.center_id,
                            `${fullName(record)} unenrolled from ${subjectName(row.subject_id)}`,
                          );
                        }}
                        trigger={
                          <Button variant="ghost" size="icon" className="size-8">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance history</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {myAssessments.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No grades recorded yet — add them from the Progress page.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myAssessments.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.title}</TableCell>
                          <TableCell>{subjectName(row.subject_id)}</TableCell>
                          <TableCell>{formatDate(row.assessment_date)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {row.score ?? "—"} / {row.max_score ?? 100}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Enrol in subject"
        submitLabel="Enrol"
        pending={enrolCrud.pending}
        onSubmit={addEnrolment}
      >
        <FieldGrid>
          <Field label="Subject">
            <SelectField
              value={subjectId}
              onChange={setSubjectId}
              placeholder="Select subject"
              options={(subjects.data ?? [])
                .filter((subject) => subject.center_id === record.center_id)
                .map((subject) => ({ value: subject.id, label: subject.name }))}
            />
          </Field>
          <Field label="Grade / Class">
            <Input value={gradeName} readOnly />
          </Field>
        </FieldGrid>
      </FormDialog>
    </>
  );
}
