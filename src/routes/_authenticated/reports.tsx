import { createFileRoute } from "@tanstack/react-router";

import { ModulePlaceholder, PageHeader } from "@/components/common/DataDisplay";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Center Management System" },
      { name: "description", content: "Reporting module for center performance and students." },
      { property: "og:title", content: "Reports — Center Management System" },
      {
        property: "og:description",
        content: "Reporting module for center performance and students.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Report generation — foundation ready, logic coming next."
      />
      <ModulePlaceholder
        title="Reports module prepared"
        description="Storage and data structures for generated reports are already in place."
        bullets={[
          "reports table with period range, typed content payload and file reference",
          "Private document storage area scoped per center for future PDF exports",
          "Center isolation enforced on every report record",
        ]}
      />
    </>
  );
}
