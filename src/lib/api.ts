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

type ScopeId = string | null | undefined;

/** Center-scoped list queries. Passing a centerId filters at the database level;
 *  Row Level Security still enforces isolation for center admins. */
export const studentsQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["students", centerId ?? "all"],
    queryFn: async (): Promise<Student[]> => {
      let q = supabase.from("students").select("*").order("created_at", { ascending: false });
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const studentQuery = (studentId: string) =>
  queryOptions({
    queryKey: ["students", "one", studentId],
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

export const teachersQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["teachers", centerId ?? "all"],
    queryFn: async (): Promise<Teacher[]> => {
      let q = supabase.from("teachers").select("*").order("created_at", { ascending: false });
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const subjectsQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["subjects", centerId ?? "all"],
    queryFn: async (): Promise<Subject[]> => {
      let q = supabase.from("subjects").select("*").order("name");
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const gradesQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["grades", centerId ?? "all"],
    queryFn: async (): Promise<Grade[]> => {
      let q = supabase
        .from("grades")
        .select("*")
        .order("level_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const centersQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["centers", centerId ?? "all"],
    queryFn: async (): Promise<Center[]> => {
      let q = supabase.from("centers").select("*").order("name");
      if (centerId) q = q.eq("id", centerId);
      return unwrap(await q);
    },
  });

export const profilesQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["profiles", centerId ?? "all"],
    queryFn: async (): Promise<Profile[]> => {
      let q = supabase.from("profiles").select("*").order("full_name");
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const subjectGradesQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["subject_grades", centerId ?? "all"],
    queryFn: async (): Promise<SubjectGrade[]> => {
      let q = supabase.from("subject_grades").select("*");
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const teacherSubjectsQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["teacher_subjects", centerId ?? "all"],
    queryFn: async (): Promise<TeacherSubject[]> => {
      let q = supabase.from("teacher_subjects").select("*");
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const studentSubjectsQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["student_subjects", centerId ?? "all"],
    queryFn: async (): Promise<StudentSubject[]> => {
      let q = supabase.from("student_subjects").select("*");
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const assessmentsQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["assessments", centerId ?? "all"],
    queryFn: async (): Promise<Assessment[]> => {
      let q = supabase
        .from("assessments")
        .select("*")
        .order("assessment_date", { ascending: false });
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const activityQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["activity_log", centerId ?? "all"],
    queryFn: async (): Promise<ActivityLog[]> => {
      let q = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const attendanceQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["attendance", centerId ?? "all"],
    queryFn: async (): Promise<AttendanceRecord[]> => {
      let q = supabase
        .from("attendance")
        .select("*")
        .order("session_date", { ascending: false })
        .limit(2000);
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const progressQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["progress_records", centerId ?? "all"],
    queryFn: async (): Promise<ProgressRecord[]> => {
      let q = supabase
        .from("progress_records")
        .select("*")
        .order("record_date", { ascending: false });
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const reportsQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["reports", centerId ?? "all"],
    queryFn: async (): Promise<CenterReport[]> => {
      let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const userRolesQuery = () =>
  queryOptions({
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

export const studentNotesQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["student_notes", centerId ?? "all"],
    queryFn: async (): Promise<StudentNote[]> => {
      let q = supabase.from("student_notes").select("*").order("created_at", { ascending: false });
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
  });

export const studentDocumentsQuery = (centerId?: ScopeId) =>
  queryOptions({
    queryKey: ["student_documents", centerId ?? "all"],
    queryFn: async (): Promise<StudentDocument[]> => {
      let q = supabase
        .from("student_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (centerId) q = q.eq("center_id", centerId);
      return unwrap(await q);
    },
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
