import { createFileRoute } from "@tanstack/react-router";

import { SearchScreen } from "@/routes/_authenticated/search";

export const Route = createFileRoute("/_authenticated/centers/$centerId/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Center search — Center Management System" },
      {
        name: "description",
        content: "Search students, teachers, classes and subjects inside this center.",
      },
      { property: "og:title", content: "Center search — Center Management System" },
      {
        property: "og:description",
        content: "Search students, teachers, classes and subjects inside this center.",
      },
    ],
  }),
  component: function CenterSearchRoute() {
    const { q } = Route.useSearch();
    return <SearchScreen q={q} />;
  },
});
