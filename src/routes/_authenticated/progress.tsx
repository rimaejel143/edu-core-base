import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, PageHeader, StatCard } from "@/components/common/DataDisplay";
import {
  ActionItem,
  ConfirmDelete,
  Field,
  FieldGrid,
  FormDialog,
  RowActions,
  SelectField,
} from "@/components/common/FormKit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useScopeId } from "@/hooks/useCenterScope";
import {
  assessmentsQuery,
  attendanceQuery,
  averageScore,
  formatDate,
  fullName,
  studentsQuery,
  subjectsQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import type { Assessment, AttendanceStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Center Management System" },
      { name: "description", content: "Track exam scores, attendance and academic progress." },
      { property: "og:title", content: "Progress — Center Management System" },
      {
        property: "og:description",
        content: "Track exam scores, attendance and academic progress.",
      },
    ],
  }),
  component: ProgressPage,
});

const today = () => new Date().toISOString().slice(0, 10);

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

interface ExamForm {
  student_id: string;
  subject_id: string;
  title: string;
  assessment_type: string;
  assessment_date: string;
  score: string;
  max_score: string;
  feedback: string;
}

const emptyExam = (): ExamForm => ({
  student_id: "",
  subject_id: "",
  title: "",
  assessment_type: "exam",
  assessment_date: today(),
  score: "",
  max_score: "100",
  feedback: "",
});

interface AttendanceForm {
  student_id: string;
  subject_id: string;
  session_date: string;
  status: AttendanceStatus;
  notes: string;
}

const emptyAttendance = (): AttendanceForm => ({
  student_id: "",
  subject_id: "",
  session_date: today(),
  status: "present",
  notes: "",
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ProgressPage() {
  const { centerId } = useAuth();
  const scopeId = useScopeId();
  const students = useQuery(studentsQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const assessments = useQuery(assessmentsQuery(scopeId));
  const attendance = useQuery(attendanceQuery(scopeId));

  const examCrud = useCrud("assessments", "Exam score");
  const attendanceCrud = useCrud("attendance", "Attendance record");

  const [studentFilter, setStudentFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [examOpen, setExamOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [examForm, setExamForm] = useState<ExamForm>(emptyExam);

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>(emptyAttendance);

  const studentOptions = (students.data ?? []).map((student) => ({
    value: student.id,
    label: `${fullName(student)} · ${student.student_code ?? ""}`.trim(),
  }));
  const subjectOptions = (subjects.data ?? []).map((subject) => ({
    value: subject.id,
    label: subject.name,
  }));

  const studentName = (id: string | null) => {
    const student = (students.data ?? []).find((row) => row.id === id);
    return student ? fullName(student) : "—";
  };
  const subjectName = (id: string | null) =>
    (subjects.data ?? []).find((row) => row.id === id)?.name ?? "—";

  const filteredExams = useMemo(
    () =>
      (assessments.data ?? []).filter((row) => {
        if (studentFilter && row.student_id !== studentFilter) return false;
        if (subjectFilter && row.subject_id !== subjectFilter) return false;
        return true;
      }),
    [assessments.data, studentFilter, subjectFilter],
  );

  const filteredAttendance = useMemo(
    () =>
      (attendance.data ?? []).filter((row) => {
        if (studentFilter && row.student_id !== studentFilter) return false;
        if (subjectFilter && row.subject_id !== subjectFilter) return false;
        return true;
      }),
    [attendance.data, studentFilter, subjectFilter],
  );

  const scores = filteredExams.filter((row) => row.score !== null);
  const percent = (row: Assessment) =>
    row.score === null || !row.max_score ? null : (Number(row.score) / Number(row.max_score)) * 100;

  const highest = scores.length ? Math.max(...scores.map((row) => Number(row.score))) : null;
  const lowest = scores.length ? Math.min(...scores.map((row) => Number(row.score))) : null;
  const attendanceRate = filteredAttendance.length
    ? Math.round(
        (filteredAttendance.filter((row) => row.status === "present").length /
          filteredAttendance.length) *
          100,
      )
    : null;

  const monthlySeries = useMemo(() => {
    const now = new Date();
    const series: { month: string; average: number }[] = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const inMonth = filteredExams.filter((row) => {
        const recorded = new Date(row.assessment_date);
        return (
          recorded.getFullYear() === date.getFullYear() && recorded.getMonth() === date.getMonth()
        );
      });
      const values = inMonth.map(percent).filter((value): value is number => value !== null);
      series.push({
        month: `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
        average: values.length
          ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
          : 0,
      });
    }
    return series;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExams]);

  const subjectSeries = (subjects.data ?? []).map((subject) => ({
    name: subject.name,
    average: averageScore(filteredExams.filter((row) => row.subject_id === subject.id)) ?? 0,
  }));

  const openCreateExam = () => {
    setEditing(null);
    setExamForm({ ...emptyExam(), student_id: studentFilter, subject_id: subjectFilter });
    setExamOpen(true);
  };

  const openEditExam = (row: Assessment) => {
    setEditing(row);
    setExamForm({
      student_id: row.student_id ?? "",
      subject_id: row.subject_id ?? "",
      title: row.title,
      assessment_type: row.assessment_type ?? "exam",
      assessment_date: row.assessment_date.slice(0, 10),
      score: row.score === null ? "" : String(row.score),
      max_score: row.max_score === null ? "" : String(row.max_score),
      feedback: row.feedback ?? "",
    });
    setExamOpen(true);
  };

  const resolveCenter = (studentId: string) =>
    (students.data ?? []).find((row) => row.id === studentId)?.center_id ?? centerId ?? "";

  const submitExam = async () => {
    const payload = {
      center_id: resolveCenter(examForm.student_id),
      student_id: examForm.student_id || null,
      subject_id: examForm.subject_id || null,
      title: examForm.title.trim(),
      assessment_type: examForm.assessment_type || null,
      assessment_date: examForm.assessment_date,
      score: examForm.score === "" ? null : Number(examForm.score),
      max_score: examForm.max_score === "" ? null : Number(examForm.max_score),
      feedback: examForm.feedback.trim() || null,
    };
    const description = `${payload.title} for ${studentName(payload.student_id)}`;
    const ok = editing
      ? await examCrud.update(editing.id, payload, `Exam score updated — ${description}`)
      : await examCrud.create(payload, `Exam score recorded — ${description}`);
    if (ok) setExamOpen(false);
  };

  const submitAttendance = async () => {
    const payload = {
      center_id: resolveCenter(attendanceForm.student_id),
      student_id: attendanceForm.student_id,
      subject_id: attendanceForm.subject_id || null,
      session_date: attendanceForm.session_date,
      status: attendanceForm.status,
      notes: attendanceForm.notes.trim() || null,
    };
    const ok = await attendanceCrud.create(
      payload,
      `Attendance ${payload.status} for ${studentName(payload.student_id)}`,
    );
    if (ok) setAttendanceOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Progress"
        description="Exam scores, attendance and academic analytics from live records."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAttendanceOpen(true)}>
              <Plus className="size-4" /> Record attendance
            </Button>
            <Button onClick={openCreateExam}>
              <Plus className="size-4" /> Add exam score
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="w-64">
            <SelectField
              value={studentFilter}
              onChange={setStudentFilter}
              placeholder="All students"
              allowEmpty
              emptyLabel="All students"
              options={studentOptions}
            />
          </div>
          <div className="w-56">
            <SelectField
              value={subjectFilter}
              onChange={setSubjectFilter}
              placeholder="All subjects"
              allowEmpty
              emptyLabel="All subjects"
              options={subjectOptions}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recorded scores" value={scores.length} icon={Pencil} />
        <StatCard label="Average score" value={averageScore(filteredExams) ?? "—"} icon={Pencil} />
        <StatCard
          label="Highest / lowest"
          value={highest === null ? "—" : `${highest} / ${lowest}`}
          icon={Pencil}
        />
        <StatCard
          label="Attendance"
          value={attendanceRate === null ? "—" : `${attendanceRate}%`}
          icon={Pencil}
        />
      </div>

      <Tabs defaultValue="scores">
        <TabsList className="mb-4">
          <TabsTrigger value="scores">Exam scores</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <Card>
            <CardContent className="p-0">
              {filteredExams.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No exam scores yet"
                    description="Add a score to start tracking academic progress."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden md:table-cell">Subject</TableHead>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExams.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.assessment_date)}</TableCell>
                          <TableCell className="font-medium">
                            {studentName(row.student_id)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {subjectName(row.subject_id)}
                          </TableCell>
                          <TableCell>{row.title}</TableCell>
                          <TableCell>
                            {row.score === null ? "—" : `${row.score} / ${row.max_score ?? "—"}`}
                          </TableCell>
                          <TableCell className="text-right">
                            <RowActions>
                              <ActionItem onSelect={() => openEditExam(row)}>
                                <Pencil className="size-4" /> Edit
                              </ActionItem>
                              <ConfirmDelete
                                title="Delete score?"
                                description="This exam record will be permanently removed."
                                onConfirm={() => {
                                  void examCrud.remove(
                                    row.id,
                                    row.center_id,
                                    `Exam score deleted — ${row.title}`,
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
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="p-0">
              {filteredAttendance.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No attendance records"
                    description="Record a session to start tracking attendance."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden md:table-cell">Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.slice(0, 100).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.session_date)}</TableCell>
                        <TableCell className="font-medium">
                          {studentName(row.student_id)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {subjectName(row.subject_id)}
                        </TableCell>
                        <TableCell className="capitalize">{row.status}</TableCell>
                        <TableCell className="text-right">
                          <RowActions>
                            <ConfirmDelete
                              title="Delete attendance record?"
                              description="This attendance entry will be permanently removed."
                              onConfirm={() => {
                                void attendanceCrud.remove(
                                  row.id,
                                  row.center_id,
                                  `Attendance record deleted for ${studentName(row.student_id)}`,
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Monthly progress (%)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Subject averages</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="average" fill="var(--color-primary)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={examOpen}
        onOpenChange={setExamOpen}
        wide
        title={editing ? "Edit exam score" : "Add exam score"}
        pending={examCrud.pending}
        onSubmit={submitExam}
      >
        <FieldGrid>
          <Field label="Student">
            <SelectField
              value={examForm.student_id}
              onChange={(value) => setExamForm({ ...examForm, student_id: value })}
              placeholder="Select student"
              options={studentOptions}
            />
          </Field>
          <Field label="Subject">
            <SelectField
              value={examForm.subject_id}
              onChange={(value) => setExamForm({ ...examForm, subject_id: value })}
              placeholder="Select subject"
              allowEmpty
              emptyLabel="Not linked"
              options={subjectOptions}
            />
          </Field>
          <Field label="Assessment title">
            <Input
              required
              value={examForm.title}
              onChange={(event) => setExamForm({ ...examForm, title: event.target.value })}
            />
          </Field>
          <Field label="Type">
            <SelectField
              value={examForm.assessment_type}
              onChange={(value) => setExamForm({ ...examForm, assessment_type: value })}
              options={[
                { value: "exam", label: "Exam" },
                { value: "quiz", label: "Quiz" },
                { value: "assignment", label: "Assignment" },
                { value: "project", label: "Project" },
              ]}
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              required
              value={examForm.assessment_date}
              onChange={(event) =>
                setExamForm({ ...examForm, assessment_date: event.target.value })
              }
            />
          </Field>
          <Field label="Score">
            <Input
              type="number"
              step="0.01"
              value={examForm.score}
              onChange={(event) => setExamForm({ ...examForm, score: event.target.value })}
            />
          </Field>
          <Field label="Maximum score">
            <Input
              type="number"
              step="0.01"
              value={examForm.max_score}
              onChange={(event) => setExamForm({ ...examForm, max_score: event.target.value })}
            />
          </Field>
        </FieldGrid>
        <Field label="Teacher feedback">
          <Textarea
            rows={3}
            value={examForm.feedback}
            onChange={(event) => setExamForm({ ...examForm, feedback: event.target.value })}
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        title="Record attendance"
        pending={attendanceCrud.pending}
        onSubmit={submitAttendance}
      >
        <Field label="Student">
          <SelectField
            value={attendanceForm.student_id}
            onChange={(value) => setAttendanceForm({ ...attendanceForm, student_id: value })}
            placeholder="Select student"
            options={studentOptions}
          />
        </Field>
        <Field label="Subject">
          <SelectField
            value={attendanceForm.subject_id}
            onChange={(value) => setAttendanceForm({ ...attendanceForm, subject_id: value })}
            placeholder="Select subject"
            allowEmpty
            emptyLabel="Not linked"
            options={subjectOptions}
          />
        </Field>
        <FieldGrid>
          <Field label="Session date">
            <Input
              type="date"
              required
              value={attendanceForm.session_date}
              onChange={(event) =>
                setAttendanceForm({ ...attendanceForm, session_date: event.target.value })
              }
            />
          </Field>
          <Field label="Status">
            <SelectField
              value={attendanceForm.status}
              onChange={(value) =>
                setAttendanceForm({ ...attendanceForm, status: value as AttendanceStatus })
              }
              options={ATTENDANCE_OPTIONS}
            />
          </Field>
        </FieldGrid>
        <Field label="Notes">
          <Textarea
            rows={2}
            value={attendanceForm.notes}
            onChange={(event) => setAttendanceForm({ ...attendanceForm, notes: event.target.value })}
          />
        </Field>
      </FormDialog>
    </>
  );
}
