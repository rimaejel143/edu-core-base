import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/common/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, fullName, studentsQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Students — Center Management System" },
      { name: "description", content: "Browse and search every student registered at your center." },
      { property: "og:title", content: "Students — Center Management System" },
      {
        property: "og:description",
        content: "Browse and search every student registered at your center.",
      },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { centerId } = useAuth();
  const { data, isLoading } = useQuery(studentsQuery(centerId));
  const [search, setSearch] = useState("");

  const students = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((student) =>
      [student.student_code, fullName(student), student.school, student.email]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [data, search]);

  return (
    <>
      <PageHeader
        title="Students"
        description="Every student record belonging to your center."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID or school"
              className="pl-9"
              aria-label="Search students"
            />
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : students.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No students found"
                description="Adjust your search, or add students once the student module is enabled."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">School</TableHead>
                    <TableHead className="hidden md:table-cell">Grade</TableHead>
                    <TableHead className="hidden lg:table-cell">Parent</TableHead>
                    <TableHead className="hidden lg:table-cell">Registered</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-xs">{student.student_code}</TableCell>
                      <TableCell className="font-medium">{fullName(student)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {student.school ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {student.school_grade ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {student.parent_name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(student.registration_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={student.status === "active" ? "default" : "secondary"}>
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
    </>
  );
}
