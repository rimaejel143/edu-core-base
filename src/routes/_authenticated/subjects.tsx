import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EmptyState, PageHeader } from "@/components/common/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { subjectsQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — Center Management System" },
      { name: "description", content: "Subjects and programs offered by your center." },
      { property: "og:title", content: "Subjects — Center Management System" },
      { property: "og:description", content: "Subjects and programs offered by your center." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { centerId } = useAuth();
  const { data, isLoading } = useQuery(subjectsQuery(centerId));
  const subjects = data ?? [];

  if (isLoading) {
    return (
      <>
        <PageHeader title="Subjects" description="Programs offered by your center." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Subjects" description="Programs offered by your center." />

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Subjects created for your center will be listed here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold">{subject.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {subject.code ?? "—"}
                    </p>
                  </div>
                  <Badge variant={subject.status === "active" ? "default" : "secondary"}>
                    {subject.status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {subject.description ?? "No description provided."}
                </p>
                {subject.level && (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">
                    Level: {subject.level}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
