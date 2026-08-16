import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, FileText, Trash2 } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/common/DataDisplay";
import {
  ActionItem,
  ConfirmDelete,
  Field,
  FieldGrid,
  FormDialog,
  RowActions,
  SelectField,
} from "@/components/common/FormKit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useScopeId } from "@/hooks/useCenterScope";
import {
  assessmentsQuery,
  attendanceQuery,
  averageScore,
  centersQuery,
  formatDate,
  formatDateTime,
  fullName,
  reportsQuery,
  studentsQuery,
  subjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";

export const Route = createFileRoute("/_authenticated/centers/$centerId/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Center Management System" },
      { name: "description", content: "Generate and export live reports from your center data." },
      { property: "og:title", content: "Reports — Center Management System" },
      {
        property: "og:description",
        content: "Generate and export live reports from your center data.",
      },
    ],
  }),
  component: ReportsPage,
});

type ReportType = "student" | "teacher" | "center" | "attendance" | "grades" | "progress";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "student", label: "Student report" },
  { value: "teacher", label: "Teacher report" },
  { value: "center", label: "Center report" },
  { value: "attendance", label: "Attendance report" },
  { value: "grades", label: "Grades report" },
  { value: "progress", label: "Progress report" },
];

const today = () => new Date().toISOString().slice(0, 10);

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header] ?? "")).join(",")),
  ].join("\n");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printAsPdf(title: string, rows: Record<string, string | number>[]) {
  const headers = rows.length ? Object.keys(rows[0]!) : [];
  const html = `<!doctype html><html><head><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}
  h1{font-size:20px;margin-bottom:4px}p{color:#666;font-size:12px;margin-top:0}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}</style>
  </head><body><h1>${title}</h1><p>Generated ${new Date().toLocaleString()}</p>
  <table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
  <tbody>${rows
    .map((row) => `<tr>${headers.map((header) => `<td>${row[header] ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function ReportsPage() {
  const { centerId } = useAuth();
  const scopeId = useScopeId();
  const students = useQuery(studentsQuery(scopeId));
  const teachers = useQuery(teachersQuery(scopeId));
  const subjects = useQuery(subjectsQuery(scopeId));
  const centers = useQuery(centersQuery(scopeId));
  const assessments = useQuery(assessmentsQuery(scopeId));
  const attendance = useQuery(attendanceQuery(scopeId));
  const reports = useQuery(reportsQuery(scopeId));
  const crud = useCrud("reports", "Report");

  const [type, setType] = useState<ReportType>("student");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");

  const inRange = (value: string | null) => {
    if (!value) return true;
    if (from && value < from) return false;
    if (to && value > to) return false;
    return true;
  };

  const studentName = (id: string | null) => {
    const student = (students.data ?? []).find((row) => row.id === id);
    return student ? fullName(student) : "—";
  };
  const subjectName = (id: string | null) =>
    (subjects.data ?? []).find((row) => row.id === id)?.name ?? "—";
  const centerName = (id: string) =>
    (centers.data ?? []).find((row) => row.id === id)?.name ?? "—";

  const rows = useMemo<Record<string, string | number>[]>(() => {
    switch (type) {
      case "student":
        return (students.data ?? [])
          .filter((student) => inRange(student.registration_date))
          .map((student) => ({
            "Student ID": student.student_code ?? "",
            Name: fullName(student),
            Email: student.email ?? "",
            Phone: student.phone ?? "",
            Parent: student.parent_name ?? "",
            Center: centerName(student.center_id),
            Enrolled: formatDate(student.registration_date),
            Status: student.status,
          }));
      case "teacher":
        return (teachers.data ?? []).map((teacher) => ({
          "Teacher ID": teacher.teacher_code ?? "",
          Name: fullName(teacher),
          Email: teacher.email ?? "",
          Phone: teacher.phone ?? "",
          Specialization: teacher.specialization ?? "",
          Center: centerName(teacher.center_id),
          Status: teacher.status,
        }));
      case "center":
        return (centers.data ?? []).map((center) => ({
          Center: center.name,
          Code: center.code,
          Students: (students.data ?? []).filter((row) => row.center_id === center.id).length,
          Teachers: (teachers.data ?? []).filter((row) => row.center_id === center.id).length,
          Subjects: (subjects.data ?? []).filter((row) => row.center_id === center.id).length,
          Status: center.status,
        }));
      case "attendance":
        return (attendance.data ?? [])
          .filter((row) => inRange(row.session_date))
          .map((row) => ({
            Date: formatDate(row.session_date),
            Student: studentName(row.student_id),
            Subject: subjectName(row.subject_id),
            Status: row.status,
          }));
      case "grades":
        return (assessments.data ?? [])
          .filter((row) => inRange(row.assessment_date))
          .map((row) => ({
            Date: formatDate(row.assessment_date),
            Student: studentName(row.student_id),
            Subject: subjectName(row.subject_id),
            Assessment: row.title,
            Score: row.score === null ? "" : Number(row.score),
            Max: row.max_score === null ? "" : Number(row.max_score),
          }));
      case "progress":
      default:
        return (students.data ?? []).map((student) => {
          const own = (assessments.data ?? []).filter(
            (row) => row.student_id === student.id && inRange(row.assessment_date),
          );
          const ownAttendance = (attendance.data ?? []).filter(
            (row) => row.student_id === student.id && inRange(row.session_date),
          );
          return {
            "Student ID": student.student_code ?? "",
            Name: fullName(student),
            Assessments: own.length,
            "Average score": averageScore(own) ?? "",
            "Attendance %": ownAttendance.length
              ? Math.round(
                  (ownAttendance.filter((row) => row.status === "present").length /
                    ownAttendance.length) *
                    100,
                )
              : "",
          };
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    type,
    from,
    to,
    students.data,
    teachers.data,
    subjects.data,
    centers.data,
    assessments.data,
    attendance.data,
  ]);

  const label = REPORT_TYPES.find((item) => item.value === type)?.label ?? "Report";

  const saveReport = async () => {
    const ok = await crud.create(
      {
        center_id: centerId,
        title: saveTitle.trim() || label,
        report_type: type,
        period_start: from || null,
        period_end: to || null,
        content: { rows: rows.slice(0, 500) },
      },
      `Report generated — ${saveTitle.trim() || label}`,
    );
    if (ok) setSaveOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Every report is generated live from the database."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadFile(
                  `${type}-report-${today()}.csv`,
                  toCsv(rows),
                  "text/csv;charset=utf-8;",
                )
              }
              disabled={rows.length === 0}
            >
              <Download className="size-4" /> Export Excel (CSV)
            </Button>
            <Button onClick={() => printAsPdf(label, rows)} disabled={rows.length === 0}>
              <FileText className="size-4" /> Export PDF
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-56">
            <Field label="Report type">
              <SelectField
                value={type}
                onChange={(value) => setType(value as ReportType)}
                options={REPORT_TYPES}
              />
            </Field>
          </div>
          <div className="w-44">
            <Field label="From">
              <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </Field>
          </div>
          <div className="w-44">
            <Field label="To">
              <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </Field>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSaveTitle(label);
              setSaveOpen(true);
            }}
            disabled={rows.length === 0}
          >
            Save report
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Nothing to report yet"
                description="Add records or widen the date range to generate this report."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(rows[0]!).map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 200).map((row, index) => (
                    <TableRow key={index}>
                      {Object.keys(rows[0]!).map((header) => (
                        <TableCell key={header}>{row[header] ?? "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Saved reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(reports.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No saved reports"
                description="Generate a report above and save it to keep a permanent record."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Period</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reports.data ?? []).map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {report.report_type ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(report.period_start)} — {formatDate(report.period_end)}
                    </TableCell>
                    <TableCell>{formatDateTime(report.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <ActionItem
                          onSelect={() => {
                            const saved =
                              ((report.content as { rows?: Record<string, string | number>[] })
                                ?.rows ?? []);
                            downloadFile(
                              `${report.title}.csv`,
                              toCsv(saved),
                              "text/csv;charset=utf-8;",
                            );
                          }}
                        >
                          <Download className="size-4" /> Download CSV
                        </ActionItem>
                        <ConfirmDelete
                          title="Delete report?"
                          description={`${report.title} will be permanently removed.`}
                          onConfirm={() => {
                            void crud.remove(
                              report.id,
                              report.center_id,
                              `Report ${report.title} deleted`,
                            );
                          }}
                          trigger={
                            <ActionItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(event) => event.preventDefault()}
                            >
                              <Trash2 className="size-4" /> Delete
                            </ActionItem>
                          }
                        />
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Save report"
        description="The current result set is stored so you can download it later."
        pending={crud.pending}
        onSubmit={() => void saveReport()}
      >
        <FieldGrid>
          <Field label="Report title">
            <Input
              required
              value={saveTitle}
              onChange={(event) => setSaveTitle(event.target.value)}
            />
          </Field>
          <Field label="Rows included">
            <Input readOnly value={String(Math.min(rows.length, 500))} />
          </Field>
        </FieldGrid>
      </FormDialog>
    </>
  );
}
