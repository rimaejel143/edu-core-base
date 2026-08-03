import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, KeyRound, Pencil, Plus, Power, Search, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  centersQuery,
  formatDate,

  profilesQuery,
  studentsQuery,
  subjectsQuery,
  teachersQuery,
} from "@/lib/api";
import { useCrud } from "@/lib/crud";
import type { Center, RecordStatus } from "@/lib/types";

/** Super Admin only. Center Admins are redirected away. */
export const Route = createFileRoute("/_authenticated/centers/")({
  head: () => ({
    meta: [
      { title: "Centers — Center Management System" },
      { name: "description", content: "Create, edit and manage every educational center." },
      { property: "og:title", content: "Centers — Center Management System" },
      {
        property: "og:description",
        content: "Create, edit and manage every educational center.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.rpc("is_super_admin");
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: CentersPage,
});

const STATUS_OPTIONS: { value: RecordStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

interface CenterForm {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website: string;
  logo_url: string;
  cover_url: string;
  description: string;
  status: RecordStatus;
}

const emptyForm = (): CenterForm => ({
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  website: "",
  logo_url: "",
  cover_url: "",
  description: "",
  status: "active",
});

function CentersPage() {
  const centers = useQuery(centersQuery);
  const profiles = useQuery(profilesQuery);
  const students = useQuery(studentsQuery);
  const teachers = useQuery(teachersQuery);
  const subjects = useQuery(subjectsQuery);
  const crud = useCrud("centers", "Center");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Center | null>(null);
  const [form, setForm] = useState<CenterForm>(emptyForm);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminCenter, setAdminCenter] = useState<Center | null>(null);
  const [adminProfileId, setAdminProfileId] = useState("");

  const adminFor = (centerId: string) =>
    (profiles.data ?? []).find((profile) => profile.center_id === centerId) ?? null;

  const countIn = (rows: { center_id: string }[] | undefined, centerId: string) =>
    (rows ?? []).filter((row) => row.center_id === centerId).length;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (centers.data ?? []).filter((center) => {
      if (statusFilter && center.status !== statusFilter) return false;
      if (!term) return true;
      const admin = adminFor(center.id);
      return [center.name, center.code, center.email, center.city, admin?.full_name, admin?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centers.data, profiles.data, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (center: Center) => {
    setEditing(center);
    setForm({
      name: center.name,
      code: center.code,
      email: center.email ?? "",
      phone: center.phone ?? "",
      address: center.address ?? "",
      city: center.city ?? "",
      country: center.country ?? "",
      website: center.website ?? "",
      logo_url: center.logo_url ?? "",
      cover_url: center.cover_url ?? "",
      description: center.description ?? "",
      status: center.status,
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      website: form.website.trim() || null,
      logo_url: form.logo_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
    };
    const ok = editing
      ? await crud.update(editing.id, { ...payload, center_id: editing.id }, `Center ${payload.name} updated`)
      : await crud.create(payload, `Center ${payload.name} created`);
    if (ok) setOpen(false);
  };

  const toggleStatus = async (center: Center) => {
    const next: RecordStatus = center.status === "active" ? "inactive" : "active";
    await crud.update(
      center.id,
      { status: next, center_id: center.id },
      `Center ${center.name} ${next === "active" ? "enabled" : "disabled"}`,
    );
  };

  const openAdmin = (center: Center) => {
    setAdminCenter(center);
    setAdminProfileId(adminFor(center.id)?.id ?? "");
    setAdminOpen(true);
  };

  const saveAdmin = async () => {
    if (!adminCenter || !adminProfileId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ center_id: adminCenter.id })
      .eq("id", adminProfileId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Center admin assigned");
    await profiles.refetch();
    setAdminOpen(false);
  };

  const resetAdminPassword = async (email: string | null) => {
    if (!email) {
      toast.error("This admin has no email on file");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Password reset link sent to ${email}`);
  };

  return (
    <>
      <PageHeader
        title="Centers"
        description="All educational centers on the platform."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add center
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by center, code, admin name or admin email"
              className="pl-9"
              aria-label="Search centers"
            />
          </div>
          <div className="w-40">
            <SelectField
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All statuses"
              allowEmpty
              emptyLabel="All statuses"
              options={STATUS_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {centers.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No centers" description="Create your first center to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((center) => {
            const admin = adminFor(center.id);
            return (
              <Card key={center.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold">
                        <Link
                          to="/centers/$centerId"
                          params={{ centerId: center.id }}
                          className="hover:underline"
                        >
                          {center.name}
                        </Link>
                      </h3>
                      <p className="font-mono text-xs text-muted-foreground">{center.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={center.status === "active" ? "default" : "secondary"}>
                        {center.status}
                      </Badge>
                      <RowActions>
                        <ActionItem asChild>
                          <Link to="/centers/$centerId" params={{ centerId: center.id }}>
                            <Eye className="size-4" /> View center
                          </Link>
                        </ActionItem>
                        <ActionItem onSelect={() => openEdit(center)}>
                          <Pencil className="size-4" /> Edit
                        </ActionItem>
                        <ActionItem onSelect={() => void toggleStatus(center)}>
                          <Power className="size-4" />{" "}
                          {center.status === "active" ? "Disable" : "Enable"}
                        </ActionItem>
                        <ActionItem onSelect={() => openAdmin(center)}>
                          <UserCog className="size-4" /> {admin ? "Change admin" : "Assign admin"}
                        </ActionItem>
                        <ActionItem onSelect={() => void resetAdminPassword(admin?.email ?? null)}>
                          <KeyRound className="size-4" /> Reset admin password
                        </ActionItem>
                        <ConfirmDelete
                          title="Delete center?"
                          description={`${center.name} and every record that belongs to it will be permanently removed.`}
                          onConfirm={() => {
                            void crud.remove(center.id, center.id, `Center ${center.name} deleted`);
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
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {[center.city, center.country].filter(Boolean).join(", ") || "—"}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 py-2">
                      <p className="font-display text-lg font-semibold">
                        {countIn(students.data, center.id)}
                      </p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 py-2">
                      <p className="font-display text-lg font-semibold">
                        {countIn(teachers.data, center.id)}
                      </p>
                      <p className="text-xs text-muted-foreground">Teachers</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 py-2">
                      <p className="font-display text-lg font-semibold">
                        {countIn(subjects.data, center.id)}
                      </p>
                      <p className="text-xs text-muted-foreground">Subjects</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p>
                      Admin:{" "}
                      <span className="text-foreground">{admin?.full_name || "Not assigned"}</span>
                    </p>
                    <p>{admin?.email ?? "—"}</p>
                    <p className="mt-1">Created {formatDate(center.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        wide
        title={editing ? "Edit center" : "Add center"}
        description="Centers are the top level of the platform hierarchy."
        pending={crud.pending}
        onSubmit={submit}
      >
        <FieldGrid>
          <Field label="Center name">
            <Input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Code">
            <Input
              required
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
          </Field>
          <Field label="Website">
            <Input
              value={form.website}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
            />
          </Field>
          <Field label="Status">
            <SelectField
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value as RecordStatus })}
              options={STATUS_OPTIONS}
            />
          </Field>
          <Field label="Logo URL">
            <Input
              value={form.logo_url}
              onChange={(event) => setForm({ ...form, logo_url: event.target.value })}
            />
          </Field>
          <Field label="Cover image URL">
            <Input
              value={form.cover_url}
              onChange={(event) => setForm({ ...form, cover_url: event.target.value })}
            />
          </Field>
        </FieldGrid>
        <Field label="Address">
          <Input
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={adminOpen}
        onOpenChange={setAdminOpen}
        title="Assign center admin"
        description={`Choose the account responsible for ${adminCenter?.name ?? "this center"}.`}
        submitLabel="Assign"
        onSubmit={() => void saveAdmin()}
      >
        <Field
          label="Center admin account"
          hint="Accounts appear here once the person has signed up on the platform."
        >
          <SelectField
            value={adminProfileId}
            onChange={setAdminProfileId}
            placeholder="Select account"
            options={(profiles.data ?? []).map((profile) => ({
              value: profile.id,
              label: `${profile.full_name || "Unnamed"} · ${profile.email ?? "no email"}`,
            }))}
          />
        </Field>
      </FormDialog>
    </>
  );
}

