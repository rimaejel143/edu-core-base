import type { Tables, Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;
export type RecordStatus = Enums<"record_status">;
export type StudentStatus = Enums<"student_status">;
export type Gender = Enums<"gender_type">;
export type AttendanceStatus = Enums<"attendance_status">;

export type Profile = Tables<"profiles">;
export type Center = Tables<"centers">;
export type Student = Tables<"students">;
export type Teacher = Tables<"teachers">;
export type Subject = Tables<"subjects">;
export type StudentSubject = Tables<"student_subjects">;
export type ProgressRecord = Tables<"progress_records">;
export type AttendanceRecord = Tables<"attendance">;
export type Assessment = Tables<"assessments">;
export type Report = Tables<"reports">;
export type CenterSettings = Tables<"center_settings">;

export interface DashboardStats {
  totalStudents: number;
  newStudents: number;
  totalTeachers: number;
  totalSubjects: number;
}

export interface RegistrationPoint {
  month: string;
  students: number;
}
