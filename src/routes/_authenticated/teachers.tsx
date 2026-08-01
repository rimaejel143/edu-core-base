import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EmptyState, PageHeader } from "@/components/common/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDate, fullName, teachersQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/teachers")({
  head: () => ({
    meta: [
      { title: "Teachers — Center Management System" },
      { name: "description", content: "Manage the teaching staff registered at your center." },
      { property: "og:title", content: "Teachers — Center Management System" },
      {
        property: "og:description",
        content: "Manage the teaching staff registered at your center.",
      },
    ],
  }),
  component: TeachersPage,
});

function TeachersPage() {
  const { centerId } = useAuth();
  const { data, isLoading } = useQuery(teachersQuery(centerId));
  const teachers = data ?? [];

  return (
    <>
      <PageHeader title="Teachers" description="Teaching staff assigned to your center." />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No teachers yet"
                description="Teachers added to your center will appear here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Specialization</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Hired</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{fullName(teacher)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {teacher.specialization ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {teacher.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(teacher.hire_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={teacher.status === "active" ? "default" : "secondary"}>
                          {teacher.status}
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
