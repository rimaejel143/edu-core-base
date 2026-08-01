import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/DataDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { centerQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Center Management System" },
      { name: "description", content: "Manage your account profile and center information." },
      { property: "og:title", content: "Settings — Center Management System" },
      {
        property: "og:description",
        content: "Manage your account profile and center information.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, user, centerId, refreshProfile, isSuperAdmin } = useAuth();
  const { data: center } = useQuery(centerQuery(centerId));

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.full_name, profile?.phone]);

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  }

  return (
    <>
      <PageHeader title="Settings" description="Your account and center configuration." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 555 0000"
              />
            </div>
            <Separator />
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <Row label="Name" value={center?.name} />
            <Row label="Code" value={center?.code} />
            <Row label="Email" value={center?.email} />
            <Row label="Phone" value={center?.phone} />
            <Row
              label="Location"
              value={[center?.city, center?.country].filter(Boolean).join(", ") || null}
            />
            <Row label="Access level" value={isSuperAdmin ? "Super Admin" : "Center Admin"} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value || "—"}</span>
    </div>
  );
}
