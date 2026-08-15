import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityLog,
  AppRole,
  Assessment,
  AttendanceRecord,
  Center,
  DashboardStats,
  Grade,
  Profile,
  ProgressRecord,
  RegistrationPoint,
  Report as CenterReport,
  Student,
  StudentDocument,
  StudentNote,
  StudentSubject,
  Subject,
  SubjectGrade,
  Teacher,
  TeacherSubject,
} from "@/lib/types";

/** Every query below is center-isolated by Row Level Security on the database. */

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export const studentsQuery = queryOptions({
  queryKey: ["students"],
  queryFn: async (): Promise<Student[]> =>
    unwrap(
      await supabase.from("students").select("*").order("created_at", { ascending: false }),
    ),
});

export const studentQuery = (studentId: string) =>
  queryOptions({
    queryKey: ["students", studentId],
    queryFn: async (): Promise<Student | null> => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const teachersQuery = queryOptions({
  queryKey: ["teachers"],
  queryFn: async (): Promise<Teacher[]> =>
    unwrap(
      await supabase.from("teachers").select("*").order("created_at", { ascending: false }),
    ),
});

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  queryFn: async (): Promise<Subject[]> =>
    unwrap(await supabase.from("subjects").select("*").order("name")),
});

export const gradesQuery = queryOptions({
  queryKey: ["grades"],
  queryFn: async (): Promise<Grade[]> =>
    unwrap(
      await supabase
        .from("grades")
        .select("*")
        .order("level_order", { ascending: true, nullsFirst: false })
        .order("name"),
    ),
});

export const centersQuery = queryOptions({
  queryKey: ["centers"],
  queryFn: async (): Promise<Center[]> =>
    unwrap(await supabase.from("centers").select("*").order("name")),
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async (): Promise<Profile[]> =>
    unwrap(await supabase.from("profiles").select("*").order("full_name")),
});

export const subjectGradesQuery = queryOptions({
  queryKey: ["subject_grades"],
  queryFn: async (): Promise<SubjectGrade[]> =>
    unwrap(await supabase.from("subject_grades").select("*")),
});

export const teacherSubjectsQuery = queryOptions({
  queryKey: ["teacher_subjects"],
  queryFn: async (): Promise<TeacherSubject[]> =>
    unwrap(await supabase.from("teacher_subjects").select("*")),
});

export const studentSubjectsQuery = queryOptions({
  queryKey: ["student_subjects"],
  queryFn: async (): Promise<StudentSubject[]> =>
    unwrap(await supabase.from("student_subjects").select("*")),
});

export const assessmentsQuery = queryOptions({
  queryKey: ["assessments"],
  queryFn: async (): Promise<Assessment[]> =>
    unwrap(
      await supabase
        .from("assessments")
        .select("*")
        .order("assessment_date", { ascending: false }),
    ),
});

export const activityQuery = queryOptions({
  queryKey: ["activity_log"],
  queryFn: async (): Promise<ActivityLog[]> =>
    unwrap(
      await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ),
});

export const attendanceQuery = queryOptions({
  queryKey: ["attendance"],
  queryFn: async (): Promise<AttendanceRecord[]> =>
    unwrap(
      await supabase
        .from("attendance")
        .select("*")
        .order("session_date", { ascending: false })
        .limit(2000),
    ),
});

export const progressQuery = queryOptions({
  queryKey: ["progress_records"],
  queryFn: async (): Promise<ProgressRecord[]> =>
    unwrap(
      await supabase
        .from("progress_records")
        .select("*")
        .order("record_date", { ascending: false }),
    ),
});

export const reportsQuery = queryOptions({
  queryKey: ["reports"],
  queryFn: async (): Promise<CenterReport[]> =>
    unwrap(
      await supabase.from("reports").select("*").order("created_at", { ascending: false }),
    ),
});

export const userRolesQuery = queryOptions({
  queryKey: ["user_roles"],
  queryFn: async (): Promise<{ user_id: string; role: AppRole }[]> =>
    unwrap(await supabase.from("user_roles").select("user_id, role")),
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

export function splitName(value: string): { first_name: string; last_name: string } {
  const parts = value.trim().split(/\s+/);
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" "),
  };
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

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function averageScore(records: { score: number | null; max_score: number | null }[]) {
  const valid = records.filter((r) => r.score !== null);
  if (valid.length === 0) return null;
  const total = valid.reduce((sum, r) => sum + Number(r.score), 0);
  return Math.round((total / valid.length) * 10) / 10;
}

export const studentNotesQuery = queryOptions({
  queryKey: ["student_notes"],
  queryFn: async (): Promise<StudentNote[]> =>
    unwrap(
      await supabase.from("student_notes").select("*").order("created_at", { ascending: false }),
    ),
});

export const studentDocumentsQuery = queryOptions({
  queryKey: ["student_documents"],
  queryFn: async (): Promise<StudentDocument[]> =>
    unwrap(
      await supabase
        .from("student_documents")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
});

/** Percentage of attendance records marked present or late. */
export function attendanceRate(records: { status: string }[]): number | null {
  if (records.length === 0) return null;
  const attended = records.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((attended / records.length) * 1000) / 10;
}

/** Monthly buckets (label + value) for any dated + scored record set. */
export function monthlySeries<T>(
  rows: T[],
  getDate: (row: T) => string | null,
  getValue: (row: T) => number | null,
  months = 6,
): { month: string; value: number }[] {
  const now = new Date();
  const series: { month: string; value: number }[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const label = `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
    const bucket = rows.filter((row) => {
      const raw = getDate(row);
      if (!raw) return false;
      const parsed = new Date(raw);
      return (
        parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth()
      );
    });
    const values = bucket.map(getValue).filter((v): v is number => v !== null);
    const value =
      values.length === 0
        ? 0
        : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
    series.push({ month: label, value });
  }
  return series;
}

/** Count of rows created within the last N days. */
export function countSince(rows: { created_at: string }[], days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return rows.filter((row) => new Date(row.created_at) >= cutoff).length;
}
