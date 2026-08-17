import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, BookOpen, GraduationCap, LineChart, Users } from "lucide-react";
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
  fullName,
  gradesQuery,
  monthlySeries,
  studentSubjectsQuery,
  studentsQuery,
  subjectGradesQuery,
  subjectsQuery,
  teacherSubjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useScopeId, useWorkspaceCenterId } from "@/hooks/useCenterScope";

export const Route = createFileRoute("/_authenticated/centers/$centerId/subjects/$subjectId")({
  head: () => ({
    meta: [
      { title: "Subject profile — Center Management System" },
      {
        name: "description",
        content: "Subject grades, teachers, enrolled students and live performance analytics.",
      },
      { property: "og:title", content: "Subject profile — Center Management System" },
      {
        property: "og:description",
        content: "Subject grades, teachers, enrolled students and live performance analytics.",
      },
    ],
  }),
  component: SubjectDetailPage,
});

function SubjectDetailPage() {
  const { subjectId } = useParams({
    from: "/_authenticated/centers/$centerId/subjects/$subjectId",
  });
  const centerId = useWorkspaceCenterId() ?? "";
  const scopeId = useScopeId();
  const subjects = useQuery(subjectsQuery(scopeId));
  const grades = useQuery(gradesQuery(scopeId));
  const subjectGrades = useQuery(subjectGradesQuery(scopeId));
  const teachers = useQuery(teachersQuery(scopeId));
  const assignments = useQuery(teacherSubjectsQuery(scopeId));
  const enrolments = useQuery(studentSubjectsQuery(scopeId));
  const students = useQuery(studentsQuery(scopeId));
  const assessments = useQuery(assessmentsQuery(scopeId));
  const attendance = useQuery(attendanceQuery(scopeId));

  const subject = subjects.data?.find((row) => row.id === subjectId) ?? null;

  const gradeName = (id: string | null) =>
    grades.data?.find((grade) => grade.id === id)?.name ?? "—";
  const teacherName = (id: string | null) => {
    const teacher = teachers.data?.find((row) => row.id === id);
    return teacher ? fullName(teacher) : "Unassigned";
  };

  const subjectAssignments = useMemo(
    () => (assignments.data ?? []).filter((row) => row.subject_id === subjectId),
    [assignments.data, subjectId],
  );

  const taughtGrades = useMemo(() => {
    const ids = new Set<string>([
      ...(subjectGrades.data ?? [])
        .filter((row) => row.subject_id === subjectId)
        .map((row) => row.grade_id),
      ...subjectAssignments.map((row) => row.grade_id).filter((id): id is string => Boolean(id)),
    ]);
    return (grades.data ?? []).filter((grade) => ids.has(grade.id));
  }, [subjectGrades.data, subjectAssignments, grades.data, subjectId]);

  const subjectTeachers = useMemo(() => {
    const ids = new Set(subjectAssignments.map((row) => row.teacher_id));
    return (teachers.data ?? []).filter((teacher) => ids.has(teacher.id));
  }, [subjectAssignments, teachers.data]);

  const subjectEnrolments = useMemo(
    () => (enrolments.data ?? []).filter((row) => row.subject_id === subjectId),
    [enrolments.data, subjectId],
  );

  const enrolledStudents = useMemo(() => {
    const ids = new Set(subjectEnrolments.map((row) => row.student_id));
    return (students.data ?? []).filter((student) => ids.has(student.id));
  }, [subjectEnrolments, students.data]);

  const subjectAssessments = useMemo(
    () => (assessments.data ?? []).filter((row) => row.subject_id === subjectId),
    [assessments.data, subjectId],
  );

  const subjectAttendance = useMemo(
    () => (attendance.data ?? []).filter((row) => row.subject_id === subjectId),
    [attendance.data, subjectId],
  );

  const performance = useMemo(
    () =>
      monthlySeries(
        subjectAssessments,
        (row) => row.assessment_date,
        (row) => (row.score === null ? null : Number(row.score)),
      ),
    [subjectAssessments],
  );

  if (subjects.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!subject) {
    return <EmptyState title="Subject not found" description="This subject no longer exists." />;
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/centers/$centerId/subjects" params={{ centerId }}>
          <ArrowLeft className="size-4" /> Back to subjects & grades
        </Link>
      </Button>

      <PageHeader
        title={subject.name}
        description={subject.description ?? subject.code ?? "Subject overview"}
        actions={
          <Badge variant={subject.status === "active" ? "default" : "secondary"}>
            {subject.status}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Grades" value={taughtGrades.length} icon={GraduationCap} />
        <StatCard label="Teachers" value={subjectTeachers.length} icon={Users} />
        <StatCard label="Students enrolled" value={enrolledStudents.length} icon={BookOpen} />
        <StatCard
          label="Average grade"
          value={averageScore(subjectAssessments) ?? "—"}
          hint={`${attendanceRate(subjectAttendance) ?? 0}% attendance`}
          icon={LineChart}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teaching assignments</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {subjectAssignments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No teacher assigned to this subject yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade</TableHead>
                    <TableHead>Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectAssignments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          to="/centers/$centerId/grades/$gradeId"
                          params={{ centerId, gradeId: row.grade_id as string }}
                          className="hover:underline"
                        >
                          {gradeName(row.grade_id)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          to="/centers/$centerId/teachers/$teacherId"
                          params={{ centerId, teacherId: row.teacher_id }}
                          className="hover:underline"
                        >
                          {teacherName(row.teacher_id)}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Enrolled students</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {enrolledStudents.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No students enrolled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">Grade</TableHead>
                    <TableHead className="hidden sm:table-cell">Teacher</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map((student) => {
                    const link = subjectEnrolments.find((row) => row.student_id === student.id);
                    return (
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
                        <TableCell className="hidden sm:table-cell">
                          {gradeName(link?.grade_id ?? student.grade_id)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {teacherName(link?.teacher_id ?? null)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {averageScore(
                            subjectAssessments.filter((row) => row.student_id === student.id),
                          ) ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
