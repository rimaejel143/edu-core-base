import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  LayoutGrid,
  TrendingUp,
  Users,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  activityQuery,
  assessmentsQuery,
  attendanceQuery,
  averageScore,
  buildRegistrationSeries,
  centersQuery,
  formatDate,
  formatDateTime,
  fullName,
  gradesQuery,
  profilesQuery,
  studentsQuery,
  subjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useScopeId } from "@/hooks/useCenterScope";

export const Route = createFileRoute("/_authenticated/centers/$centerId/")({
  head: () => ({
    meta: [
      { title: "Center profile — Center Management System" },
      { name: "description", content: "Full profile, analytics and records for one center." },
      { property: "og:title", content: "Center profile — Center Management System" },
      {
        property: "og:description",
        content: "Full profile, analytics and records for one center.",
      },
    ],
  }),
  component: CenterProfilePage,
});

function CenterProfilePage() {
  const { centerId } = useParams({ from: "/_authenticated/centers/$centerId/" });

  const scopeId = useScopeId();
  const centers = useQuery(centersQuery(scopeId));
  const students = useQuery(studentsQuery(scopeId));
  const teachers = useQuery(teachersQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const grades = useQuery(gradesQuery(scopeId));
  const attendance = useQuery(attendanceQuery(scopeId));
  const assessments = useQuery(assessmentsQuery(scopeId));
  const activity = useQuery(activityQuery(scopeId));
  const profiles = useQuery(profilesQuery(scopeId));

  const center = centers.data?.find((row) => row.id === centerId) ?? null;

  const scoped = useMemo(() => {
    const by = <T extends { center_id: string }>(rows: T[] | undefined) =>
      (rows ?? []).filter((row) => row.center_id === centerId);
    return {
      students: by(students.data),
      teachers: by(teachers.data),
      subjects: by(subjects.data),
      grades: by(grades.data),
      attendance: by(attendance.data),
      assessments: by(assessments.data),
      activity: by(activity.data),
      admins: (profiles.data ?? []).filter((profile) => profile.center_id === centerId),
    };
  }, [
    centerId,
    students.data,
    teachers.data,
    subjects.data,
    grades.data,
    attendance.data,
    assessments.data,
    activity.data,
    profiles.data,
  ]);

  const attendanceRate = scoped.attendance.length
    ? Math.round(
        (scoped.attendance.filter((row) => row.status === "present").length /
          scoped.attendance.length) *
          100,
      )
    : null;

  const average = averageScore(scoped.assessments);
  const registrationSeries = buildRegistrationSeries(scoped.students, 6);

  const subjectPerformance = scoped.subjects.map((subject) => ({
    name: subject.name,
    average:
      averageScore(scoped.assessments.filter((row) => row.subject_id === subject.id)) ?? 0,
  }));

  if (!centers.isLoading && !center) {
    return (
      <EmptyState
        title="Center not found"
        description="This center may have been deleted or you no longer have access to it."
      />
    );
  }

  return (
    <>
      <PageHeader
        title={center?.name ?? "Center"}
        description={
          center
            ? [center.code, center.city, center.country].filter(Boolean).join(" · ")
            : "Loading center…"
        }
        actions={
          <Button variant="outline" asChild>
            <Link to="/centers">Back to centers</Link>
          </Button>
        }
      />

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Students" value={scoped.students.length} icon={Users} />
            <StatCard
              label="Active students"
              value={scoped.students.filter((row) => row.status === "active").length}
              icon={Users}
            />
            <StatCard label="Teachers" value={scoped.teachers.length} icon={GraduationCap} />
            <StatCard label="Subjects" value={scoped.subjects.length} icon={BookOpen} />
            <StatCard label="Classes" value={scoped.grades.length} icon={LayoutGrid} />
            <StatCard
              label="Attendance"
              value={attendanceRate === null ? "—" : `${attendanceRate}%`}
              icon={CalendarCheck}
            />
            <StatCard label="Average score" value={average ?? "—"} icon={TrendingUp} />
            <StatCard label="Center admins" value={scoped.admins.length} icon={Users} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Monthly registrations</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={registrationSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="students"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scoped.activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  scoped.activity.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="text-sm">
                      <p>{entry.description ?? `${entry.action} ${entry.entity_type}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actor_name ?? "System"} · {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardContent className="p-0">
              {scoped.students.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No students"
                    description="Students registered at this center will appear here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Grade</TableHead>
                        <TableHead className="hidden md:table-cell">Enrolled</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scoped.students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-mono text-xs">
                            {student.student_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              to="/centers/$centerId/students/$studentId"
                              params={{ centerId, studentId: student.id }}
                              className="hover:underline"
                            >
                              {fullName(student)}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {scoped.grades.find((grade) => grade.id === student.grade_id)?.name ??
                              "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(student.registration_date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={student.status === "active" ? "default" : "secondary"}
                            >
                              {student.status}
                            </Badge>
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

        <TabsContent value="teachers">
          <Card>
            <CardContent className="p-0">
              {scoped.teachers.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No teachers"
                    description="Teachers hired by this center will appear here."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Specialization</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scoped.teachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{fullName(teacher)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {teacher.email ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {teacher.specialization ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={teacher.status === "active" ? "default" : "secondary"}>
                            {teacher.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          {scoped.subjects.length === 0 ? (
            <EmptyState
              title="No subjects"
              description="Subjects created for this center will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {scoped.subjects.map((subject) => {
                const subjectAverage = averageScore(
                  scoped.assessments.filter((row) => row.subject_id === subject.id),
                );
                return (
                  <Card key={subject.id}>
                    <CardContent className="p-5">
                      <h3 className="font-display text-base font-semibold">{subject.name}</h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        {subject.code ?? "—"}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Average score: {subjectAverage ?? "—"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="classes">
          {scoped.grades.length === 0 ? (
            <EmptyState
              title="No classes"
              description="Grades and classes created for this center will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {scoped.grades.map((grade) => (
                <Card key={grade.id}>
                  <CardContent className="p-5">
                    <h3 className="font-display text-base font-semibold">{grade.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {scoped.students.filter((student) => student.grade_id === grade.id).length}{" "}
                      students
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="p-0">
              {scoped.attendance.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No attendance yet"
                    description="Attendance recorded from the Progress page appears here."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scoped.attendance.slice(0, 50).map((row) => {
                      const student = scoped.students.find((item) => item.id === row.student_id);
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.session_date)}</TableCell>
                          <TableCell>{student ? fullName(student) : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === "present" ? "default" : "secondary"}>
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Subject performance</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {subjectPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects to analyse yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="average" fill="var(--color-primary)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Center information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Name" value={center?.name} />
              <Info label="Code" value={center?.code} />
              <Info label="Email" value={center?.email} />
              <Info label="Phone" value={center?.phone} />
              <Info label="Address" value={center?.address} />
              <Info label="Website" value={center?.website} />
              <Info label="Status" value={center?.status} />
              <Info label="Created" value={center ? formatDate(center.created_at) : null} />
              <Info label="Updated" value={center ? formatDate(center.updated_at) : null} />
              <Info label="Center admin" value={scoped.admins[0]?.full_name} />
              <Info label="Admin email" value={scoped.admins[0]?.email} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}
