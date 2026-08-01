import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  Center,
  DashboardStats,
  RegistrationPoint,
  Student,
  Subject,
  Teacher,
} from "@/lib/types";

/** Every query below is center-isolated by Row Level Security on the database. */

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export const studentsQuery = (centerId: string | null) =>
  queryOptions({
    queryKey: ["students", centerId],
    enabled: Boolean(centerId),
    queryFn: async (): Promise<Student[]> =>
      unwrap(
        await supabase
          .from("students")
          .select("*")
          .order("created_at", { ascending: false }),
      ),
  });

export const teachersQuery = (centerId: string | null) =>
  queryOptions({
    queryKey: ["teachers", centerId],
    enabled: Boolean(centerId),
    queryFn: async (): Promise<Teacher[]> =>
      unwrap(
        await supabase.from("teachers").select("*").order("created_at", { ascending: false }),
      ),
  });

export const subjectsQuery = (centerId: string | null) =>
  queryOptions({
    queryKey: ["subjects", centerId],
    enabled: Boolean(centerId),
    queryFn: async (): Promise<Subject[]> =>
      unwrap(await supabase.from("subjects").select("*").order("name")),
  });

export const centerQuery = (centerId: string | null) =>
  queryOptions({
    queryKey: ["center", centerId],
    enabled: Boolean(centerId),
    queryFn: async (): Promise<Center | null> => {
      const { data, error } = await supabase
        .from("centers")
        .select("*")
        .eq("id", centerId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function buildStats(
  students: Student[],
  teachers: Teacher[],
  subjects: Subject[],
): DashboardStats {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  return {
    totalStudents: students.length,
    newStudents: students.filter((s) => new Date(s.registration_date) >= cutoff).length,
    totalTeachers: teachers.filter((t) => t.status === "active").length,
    totalSubjects: subjects.filter((s) => s.status === "active").length,
  };
}

export function buildRegistrationSeries(students: Student[], months = 6): RegistrationPoint[] {
  const now = new Date();
  const series: RegistrationPoint[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const label = `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
    const count = students.filter((student) => {
      const registered = new Date(student.registration_date);
      return (
        registered.getFullYear() === date.getFullYear() &&
        registered.getMonth() === date.getMonth()
      );
    }).length;
    series.push({ month: label, students: count });
  }

  return series;
}

export function fullName(person: { first_name: string; last_name: string }): string {
  return `${person.first_name} ${person.last_name}`.trim();
}

export function initials(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
