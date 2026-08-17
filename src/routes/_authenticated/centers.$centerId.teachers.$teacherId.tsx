import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, BookOpen, GraduationCap, LineChart, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
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
  countSince,
  formatDate,
  fullName,
  gradesQuery,
  monthlySeries,
  studentSubjectsQuery,
  studentsQuery,
  subjectsQuery,
  teacherSubjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useScopeId, useWorkspaceCenterId } from "@/hooks/useCenterScope";

export const Route = createFileRoute("/_authenticated/centers/$centerId/teachers/$teacherId")({
  head: () => ({
    meta: [
      { title: "Teacher profile — Center Management System" },
      {
        name: "description",
        content:
          "Teacher profile with assigned students, subjects, grades and performance analytics.",
      },
      { property: "og:title", content: "Teacher profile — Center Management System" },
      {
        property: "og:description",
        content:
          "Teacher profile with assigned students, subjects, grades and performance analytics.",
      },
    ],
  }),
  component: TeacherDetailPage,
});

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function TeacherDetailPage() {
  const { teacherId } = useParams({
    from: "/_authenticated/centers/$centerId/teachers/$teacherId",
  });
  const centerId = useWorkspaceCenterId() ?? "";
  const scopeId = useScopeId();
  const teachers = useQuery(teachersQuery(scopeId));
  const teacherSubjects = useQuery(teacherSubjectsQuery(scopeId));
  const studentSubjects = useQuery(studentSubjectsQuery(scopeId));
  const students = useQuery(studentsQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const grades = useQuery(gradesQuery(scopeId));
  const centers = useQuery(centersQuery(scopeId));
  const assessments = useQuery(assessmentsQuery(scopeId));
  const attendance = useQuery(attendanceQuery(scopeId));

  const teacher = teachers.data?.find((row) => row.id === teacherId) ?? null;

  const links = useMemo(
    () => (teacherSubjects.data ?? []).filter((row) => row.teacher_id === teacherId),
    [teacherSubjects.data, teacherId],
  );

  // A student counts for this teacher when the enrolment matches one of the
  // teacher's grade + subject assignments (or names the teacher explicitly).
  const enrolments = useMemo(
    () =>
      (studentSubjects.data ?? []).filter(
        (row) =>
          row.teacher_id === teacherId ||
          links.some(
            (link) => link.subject_id === row.subject_id && link.grade_id === row.grade_id,
          ),
      ),
    [studentSubjects.data, links, teacherId],
  );

  const studentIds = useMemo(
    () => Array.from(new Set(enrolments.map((row) => row.student_id))),
    [enrolments],
  );

  const myStudents = useMemo(
    () => (students.data ?? []).filter((student) => studentIds.includes(student.id)),
    [students.data, studentIds],
  );

  const subjectIds = useMemo(
    () => Array.from(new Set(links.map((row) => row.subject_id))),
    [links],
  );

  const classIds = useMemo(
    () =>
      Array.from(
        new Set(
          links.map((row) => row.grade_id).filter((value): value is string => Boolean(value)),
        ),
      ),
    [links],
  );

  const myAssessments = useMemo(
    () =>
      (assessments.data ?? []).filter(
        (row) =>
          row.student_id !== null &&
          studentIds.includes(row.student_id) &&
          (row.subject_id === null || subjectIds.includes(row.subject_id)),
      ),
    [assessments.data, studentIds, subjectIds],
  );

  const myAttendance = useMemo(
    () =>
      (attendance.data ?? []).filter(
        (row) =>
          studentIds.includes(row.student_id) &&
          (row.subject_id === null || subjectIds.includes(row.subject_id)),
      ),
    [attendance.data, studentIds, subjectIds],
  );

  const growth = useMemo(() => {
    const now = new Date();
    const series: { month: string; students: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const cutoff = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      const label = cutoff.toLocaleDateString(undefined, { month: "short" });
      series.push({
        month: label,
        students: enrolments.filter((row) => new Date(row.created_at) < cutoff).length,
      });
    }
    return series;
  }, [enrolments]);

  const performance = useMemo(
    () =>
      monthlySeries(
        myAssessments,
        (row) => row.assessment_date,
        (row) => (row.score === null ? null : Number(row.score)),
      ),
    [myAssessments],
  );

  if (teachers.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!teacher) {
    return <EmptyState title="Teacher not found" description="This teacher no longer exists." />;
  }

  const centerName = centers.data?.find((c) => c.id === teacher.center_id)?.name ?? "—";
  const subjectName = (id: string | null) =>
    subjects.data?.find((subject) => subject.id === id)?.name ?? "—";
  const gradeName = (id: string | null) =>
    grades.data?.find((grade) => grade.id === id)?.name ?? "—";

  const average = averageScore(myAssessments);
  const rate = attendanceRate(myAttendance);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/centers/$centerId/teachers" params={{ centerId }}>
          <ArrowLeft className="size-4" /> Back to teachers
        </Link>
      </Button>

      <PageHeader
        title={fullName(teacher)}
        description={`Teacher ID ${teacher.teacher_code ?? "—"} · ${centerName}`}
        actions={
          <Badge variant={teacher.status === "active" ? "default" : "secondary"}>
            {teacher.status}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={myStudents.length} icon={Users} />
        <StatCard label="Subjects" value={subjectIds.length} icon={BookOpen} />
        <StatCard label="Grades" value={classIds.length} icon={GraduationCap} />
        <StatCard
          label="Average student score"
          value={average ?? "—"}
          hint={`${rate ?? 0}% attendance`}
          icon={LineChart}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="New students (7 days)" value={countSince(enrolments, 7)} icon={Users} />
        <StatCard label="New students (30 days)" value={countSince(enrolments, 30)} icon={Users} />
        <StatCard
          label="New students (365 days)"
          value={countSince(enrolments, 365)}
          icon={Users}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student growth</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="students" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average score trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border pt-0">
            <DetailRow label="Teacher ID" value={teacher.teacher_code ?? "—"} />
            <DetailRow label="Email" value={teacher.email ?? "—"} />
            <DetailRow label="Phone" value={teacher.phone ?? "—"} />
            <DetailRow label="Specialization" value={teacher.specialization ?? "—"} />
            <DetailRow label="Hired" value={formatDate(teacher.hire_date)} />
            <DetailRow label="Center" value={centerName} />
            <DetailRow label="Address" value={teacher.address ?? "—"} />
            <DetailRow
              label="Subjects"
              value={subjectIds.map((id) => subjectName(id)).join(", ") || "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students taught</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {myStudents.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No students assigned yet — assign subjects to this teacher first.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden sm:table-cell">Grade</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myStudents.map((student) => (
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
                          {gradeName(student.grade_id)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {averageScore(
                            myAssessments.filter((row) => row.student_id === student.id),
                          ) ?? "—"}
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
    </>
  );
}
