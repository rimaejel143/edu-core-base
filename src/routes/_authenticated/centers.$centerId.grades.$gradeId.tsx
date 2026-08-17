import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, BookOpen, CalendarCheck, LineChart, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, PageHeader, StatCard } from "@/components/common/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  attendanceQuery,
  attendanceRate,
  averageScore,
  centersQuery,
  fullName,
  gradesQuery,
  studentSubjectsQuery,
  studentsQuery,
  subjectGradesQuery,
  subjectsQuery,
  teacherSubjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useScopeId, useWorkspaceCenterId } from "@/hooks/useCenterScope";

export const Route = createFileRoute("/_authenticated/centers/$centerId/classes/$gradeId")({
  head: () => ({
    meta: [
      { title: "Class overview — Center Management System" },
      {
        name: "description",
        content: "Class roster, subjects, teachers, attendance and grade analytics.",
      },
      { property: "og:title", content: "Class overview — Center Management System" },
      {
        property: "og:description",
        content: "Class roster, subjects, teachers, attendance and grade analytics.",
      },
    ],
  }),
  component: ClassDetailPage,
});

function ClassDetailPage() {
  const { gradeId } = useParams({ from: "/_authenticated/centers/$centerId/classes/$gradeId" });
  const centerId = useWorkspaceCenterId() ?? "";
  const scopeId = useScopeId();
  const grades = useQuery(gradesQuery(scopeId));
  const centers = useQuery(centersQuery(scopeId));
  const students = useQuery(studentsQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const subjectGrades = useQuery(subjectGradesQuery(scopeId));
  const teachers = useQuery(teachersQuery(scopeId));
  const teacherSubjects = useQuery(teacherSubjectsQuery(scopeId));
  const studentSubjects = useQuery(studentSubjectsQuery(scopeId));
  const assessments = useQuery(assessmentsQuery(scopeId));
  const attendance = useQuery(attendanceQuery(scopeId));

  const grade = grades.data?.find((row) => row.id === gradeId) ?? null;

  const roster = useMemo(
    () => (students.data ?? []).filter((student) => student.grade_id === gradeId),
    [students.data, gradeId],
  );
  const rosterIds = useMemo(() => roster.map((student) => student.id), [roster]);

  const classSubjects = useMemo(() => {
    const linked = (subjectGrades.data ?? [])
      .filter((row) => row.grade_id === gradeId)
      .map((row) => row.subject_id);
    const enrolled = (studentSubjects.data ?? [])
      .filter((row) => row.grade_id === gradeId)
      .map((row) => row.subject_id);
    const ids = Array.from(new Set([...linked, ...enrolled]));
    return (subjects.data ?? []).filter((subject) => ids.includes(subject.id));
  }, [subjectGrades.data, studentSubjects.data, subjects.data, gradeId]);

  const classTeachers = useMemo(() => {
    const subjectIds = classSubjects.map((subject) => subject.id);
    const ids = new Set(
      (teacherSubjects.data ?? [])
        .filter((row) => row.grade_id === gradeId || subjectIds.includes(row.subject_id))
        .map((row) => row.teacher_id),
    );
    return (teachers.data ?? []).filter((teacher) => ids.has(teacher.id));
  }, [teacherSubjects.data, teachers.data, classSubjects, gradeId]);

  const classAssessments = useMemo(
    () =>
      (assessments.data ?? []).filter(
        (row) => row.student_id !== null && rosterIds.includes(row.student_id),
      ),
    [assessments.data, rosterIds],
  );

  const classAttendance = useMemo(
    () => (attendance.data ?? []).filter((row) => rosterIds.includes(row.student_id)),
    [attendance.data, rosterIds],
  );

  const subjectPerformance = useMemo(
    () =>
      classSubjects.map((subject) => ({
        subject: subject.name,
        average:
          averageScore(classAssessments.filter((row) => row.subject_id === subject.id)) ?? 0,
      })),
    [classSubjects, classAssessments],
  );

  if (grades.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!grade) {
    return <EmptyState title="Class not found" description="This class no longer exists." />;
  }

  const centerName = centers.data?.find((c) => c.id === grade.center_id)?.name ?? "—";
  const rate = attendanceRate(classAttendance);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/centers/$centerId/subjects" params={{ centerId }}>
          <ArrowLeft className="size-4" /> Back to subjects & classes
        </Link>
      </Button>

      <PageHeader
        title={grade.name}
        description={`${centerName}${grade.room ? ` · Room ${grade.room}` : ""}`}
        actions={
          <Badge variant={grade.status === "active" ? "default" : "secondary"}>
            {grade.status}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={roster.length}
          hint={grade.capacity ? `Capacity ${grade.capacity}` : "No capacity set"}
          icon={Users}
        />
        <StatCard label="Subjects" value={classSubjects.length} icon={BookOpen} />
        <StatCard label="Teachers" value={classTeachers.length} icon={Users} />
        <StatCard
          label="Average grade"
          value={averageScore(classAssessments) ?? "—"}
          hint={`${rate ?? 0}% attendance`}
          icon={LineChart}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by subject</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            {subjectPerformance.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No subject data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="average" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="size-4" /> Attendance breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {classAttendance.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No attendance recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {(["present", "late", "absent", "excused"] as const).map((status) => {
                  const count = classAttendance.filter((row) => row.status === status).length;
                  return (
                    <div key={status} className="flex items-center justify-between py-3">
                      <span className="text-sm capitalize text-muted-foreground">{status}</span>
                      <span className="text-sm font-medium">
                        {count} ·{" "}
                        {Math.round((count / classAttendance.length) * 1000) / 10}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {roster.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No students assigned to this class yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Student ID</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/centers/$centerId/students/$studentId"
                          params={{ centerId, studentId: student.id }}
                          className="hover:underline"
                        >
                          {fullName(student)}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs sm:table-cell">
                        {student.student_code ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={student.status === "active" ? "default" : "secondary"}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {averageScore(
                          classAssessments.filter((row) => row.student_id === student.id),
                        ) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {attendanceRate(
                          classAttendance.filter((row) => row.student_id === student.id),
                        ) ?? "—"}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Teachers</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {classTeachers.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No teachers assigned yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {classTeachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  to="/centers/$centerId/teachers/$teacherId"
                  params={{ centerId, teacherId: teacher.id }}
                  className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/60"
                >
                  <p className="font-display text-sm font-semibold">{fullName(teacher)}</p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.specialization ?? "Staff"} · {teacher.teacher_code ?? "—"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
