import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  GraduationCap,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, StatCard } from "@/components/common/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  activityQuery,
  buildRegistrationSeries,
  buildStats,
  formatDate,
  formatDateTime,
  fullName,
  studentsQuery,
  subjectsQuery,
  teachersQuery,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Center Management System" },
      { name: "description", content: "Live overview of students, teachers and subjects." },
      { property: "og:title", content: "Dashboard — Center Management System" },
      {
        property: "og:description",
        content: "Live overview of students, teachers and subjects.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile } = useAuth();
  const students = useQuery(studentsQuery);
  const teachers = useQuery(teachersQuery);
  const subjects = useQuery(subjectsQuery);
  const activity = useQuery(activityQuery);

  const isLoading = students.isLoading || teachers.isLoading || subjects.isLoading;
  const stats = buildStats(students.data ?? [], teachers.data ?? [], subjects.data ?? []);
  const series = buildRegistrationSeries(students.data ?? []);
  const recent = (students.data ?? []).slice(0, 6);

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Operational overview for your center."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          label="New Students"
          value={stats.newStudents}
          hint="Registered in the last 30 days"
          icon={UserPlus}
          isLoading={isLoading}
        />
        <StatCard
          label="Teachers"
          value={stats.totalTeachers}
          icon={GraduationCap}
          isLoading={isLoading}
        />
        <StatCard
          label="Subjects"
          value={stats.totalSubjects}
          icon={BookOpen}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Student registrations</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-0">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="students"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#registrations)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {isLoading && <Skeleton className="h-40 w-full" />}
            {!isLoading &&
              (activity.data ?? []).slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Activity className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.description ?? `${entry.entity_type} ${entry.action}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.actor_name ?? "System"} · {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            {!isLoading && (activity.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recent students</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="divide-y divide-border">
              {recent.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{fullName(student)}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.student_code} · {student.school ?? "—"} ·{" "}
                      {student.school_grade ?? "—"}
                    </p>
                  </div>
                  <Badge variant={student.status === "active" ? "default" : "secondary"}>
                    {student.status}
                  </Badge>
                </div>
              ))}
              {recent.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No students yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
