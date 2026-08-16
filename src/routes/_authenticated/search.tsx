import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/common/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  centersQuery,
  fullName,
  gradesQuery,
  profilesQuery,
  studentsQuery,
  subjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useScopeId } from "@/hooks/useCenterScope";

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Search — Center Management System" },
      {
        name: "description",
        content: "Search centers, students, teachers, classes and subjects across the platform.",
      },
      { property: "og:title", content: "Search — Center Management System" },
      {
        property: "og:description",
        content: "Search centers, students, teachers, classes and subjects across the platform.",
      },
    ],
  }),
  component: SearchPage,
});

type ResultKind = "Center" | "Student" | "Teacher" | "Class" | "Subject" | "Admin";

interface Result {
  id: string;
  kind: ResultKind;
  name: string;
  center: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
}

function matches(term: string, values: (string | null | undefined)[]) {
  return values
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

function SearchPage() {
  const { q } = Route.useSearch();
  const { isSuperAdmin } = useAuth();
  const [term, setTerm] = useState(q);

  const scopeId = useScopeId();
  const centers = useQuery(centersQuery(scopeId));
  const students = useQuery(studentsQuery(scopeId));
  const teachers = useQuery(teachersQuery(scopeId));
  const grades = useQuery(gradesQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const profiles = useQuery(profilesQuery(scopeId));

  const isLoading =
    centers.isLoading ||
    students.isLoading ||
    teachers.isLoading ||
    grades.isLoading ||
    subjects.isLoading;

  const results = useMemo<Result[]>(() => {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) return [];

    const centerName = (id: string | null) =>
      centers.data?.find((center) => center.id === id)?.name ?? "—";

    const out: Result[] = [];

    for (const center of centers.data ?? []) {
      if (matches(needle, [center.name, center.code, center.email, center.phone, center.city])) {
        out.push({
          id: center.id,
          kind: "Center",
          name: center.name,
          center: center.name,
          detail: `${center.code} · ${center.email ?? "no email"} · ${center.status}`,
          to: "/centers/$centerId",
          params: { centerId: center.id },
        });
      }
    }

    for (const profile of profiles.data ?? []) {
      if (matches(needle, [profile.full_name, profile.email, profile.phone])) {
        out.push({
          id: profile.id,
          kind: "Admin",
          name: profile.full_name || profile.email || "Administrator",
          center: centerName(profile.center_id),
          detail: `${profile.email ?? "no email"} · ${profile.status}`,
          to: "/centers",
        });
      }
    }

    for (const student of students.data ?? []) {
      if (
        matches(needle, [
          student.student_code,
          fullName(student),
          student.email,
          student.phone,
          student.parent_name,
          student.parent_phone,
        ])
      ) {
        out.push({
          id: student.id,
          kind: "Student",
          name: fullName(student),
          center: centerName(student.center_id),
          detail: `${student.student_code ?? "—"} · ${student.email ?? student.phone ?? "no contact"}`,
          to: "/students/$studentId",
          params: { studentId: student.id },
        });
      }
    }

    for (const teacher of teachers.data ?? []) {
      if (
        matches(needle, [
          teacher.teacher_code,
          fullName(teacher),
          teacher.email,
          teacher.phone,
          teacher.specialization,
        ])
      ) {
        out.push({
          id: teacher.id,
          kind: "Teacher",
          name: fullName(teacher),
          center: centerName(teacher.center_id),
          detail: `${teacher.teacher_code ?? "—"} · ${teacher.specialization ?? "staff"}`,
          to: "/teachers/$teacherId",
          params: { teacherId: teacher.id },
        });
      }
    }

    for (const grade of grades.data ?? []) {
      if (matches(needle, [grade.name, grade.room, grade.description])) {
        out.push({
          id: grade.id,
          kind: "Class",
          name: grade.name,
          center: centerName(grade.center_id),
          detail: grade.room ? `Room ${grade.room}` : "Class group",
          to: "/classes/$gradeId",
          params: { gradeId: grade.id },
        });
      }
    }

    for (const subject of subjects.data ?? []) {
      if (matches(needle, [subject.name, subject.code, subject.level, subject.description])) {
        out.push({
          id: subject.id,
          kind: "Subject",
          name: subject.name,
          center: centerName(subject.center_id),
          detail: `${subject.code ?? "—"} · ${subject.level ?? "all levels"}`,
          to: "/subjects",
        });
      }
    }

    return out;
  }, [term, centers.data, profiles.data, students.data, teachers.data, grades.data, subjects.data]);

  return (
    <>
      <PageHeader
        title="Search"
        description={
          isSuperAdmin
            ? "Search every center, student, teacher, class and subject on the platform."
            : "Search students, teachers, classes and subjects inside your center."
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Name, ID, code, email, phone or parent name"
              className="pl-9"
              aria-label="Search the platform"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-52 w-full" />
      ) : term.trim().length < 2 ? (
        <EmptyState
          title="Start typing"
          description="Enter at least two characters to search across the platform."
        />
      ) : results.length === 0 ? (
        <EmptyState title="No matches" description={`Nothing found for "${term}".`} />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {results.slice(0, 100).map((result) => (
              <Link
                key={`${result.kind}-${result.id}`}
                to={result.to}
                params={result.params as never}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{result.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{result.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {result.center}
                  </span>
                  <Badge variant="secondary">{result.kind}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
