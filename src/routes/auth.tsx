import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Center Management System" },
      {
        name: "description",
        content: "Secure sign in for center administrators managing students and staff.",
      },
      { property: "og:title", content: "Sign in — Center Management System" },
      {
        property: "og:description",
        content: "Secure sign in for center administrators managing students and staff.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { session, isLoading, signIn, signUp, requestPasswordReset } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && session) void navigate({ to: "/dashboard", replace: true });
  }, [isLoading, session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (mode === "forgot") {
      const parsed = z.string().trim().email().safeParse(email);
      if (!parsed.success) {
        toast.error("Enter a valid email address");
        return;
      }
      setIsSubmitting(true);
      const { error } = await requestPasswordReset(parsed.data);
      setIsSubmitting(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Password reset link sent. Check your inbox.");
      setMode("signin");
      return;
    }

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }

    setIsSubmitting(true);
    const { error } =
      mode === "signin"
        ? await signIn(parsed.data.email, parsed.data.password)
        : await signUp(parsed.data.email, parsed.data.password, fullName.trim());
    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (mode === "signup") {
      toast.success("Account created. Check your email if confirmation is required.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Center Management System</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Internal administration platform for educational centers.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {mode === "forgot" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">Reset your password</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll email you a secure link to choose a new password.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Send reset link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </Button>
              </form>
            ) : (
              <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-5">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <EmailPasswordFields
                      email={email}
                      password={password}
                      onEmail={setEmail}
                      onPassword={setPassword}
                      passwordAutoComplete="current-password"
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                      Sign in
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full name</Label>
                      <Input
                        id="full-name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        autoComplete="name"
                        required
                      />
                    </div>
                    <EmailPasswordFields
                      email={email}
                      password={password}
                      onEmail={setEmail}
                      onPassword={setPassword}
                      passwordAutoComplete="new-password"
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function EmailPasswordFields({
  email,
  password,
  onEmail,
  onPassword,
  passwordAutoComplete,
}: {
  email: string;
  password: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  passwordAutoComplete: "current-password" | "new-password";
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`email-${passwordAutoComplete}`}>Email</Label>
        <Input
          id={`email-${passwordAutoComplete}`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`password-${passwordAutoComplete}`}>Password</Label>
        <Input
          id={`password-${passwordAutoComplete}`}
          type="password"
          autoComplete={passwordAutoComplete}
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          required
        />
      </div>
    </>
  );
}
