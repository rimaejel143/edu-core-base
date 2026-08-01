import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder, PageHeader } from "@/components/common/DataDisplay";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Center Management System" },
      { name: "description", content: "Academic progress tracking module for your center." },
      { property: "og:title", content: "Progress — Center Management System" },
      {
        property: "og:description",
        content: "Academic progress tracking module for your center.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <>
      <PageHeader
        title="Progress"
        description="Academic progress tracking — foundation ready, logic coming next."
      />
      <ModulePlaceholder
        title="Progress module prepared"
        description="Database structures, center isolation and access rules for progress tracking already exist."
        bullets={[
          "progress_records table with student, subject, teacher, score and level fields",
          "attendance table with per-session status records",
          "assessments table for graded work and feedback",
          "All tables are center-isolated and protected by row-level security",
        ]}
      />
    </>
  );
}
