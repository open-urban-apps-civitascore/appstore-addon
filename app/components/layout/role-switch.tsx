import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { FlaskConical, Repeat2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { MOCK_ROLE_COOKIE, MOCK_ROLE_PROFILES, type MockRole } from "@/lib/mock-role";
import { isMockMode } from "@/lib/server/mock/mode";

const ROLES: MockRole[] = ["commune", "curator"];

/**
 * Demo control: switch between the commune view and the Civitas Connect view.
 * A plain form posting to a server function — the cookie is set server-side and
 * the layout revalidated, so the navigation re-evaluates which sections exist.
 *
 * MOCK: a real deployment derives this from the user's permissions — a
 * user-settable role would be a privilege-escalation hole, not a feature.
 */
export function RoleSwitch({ role }: { role: MockRole }) {
  async function switchRole(formData: FormData) {
    "use server";
    const next: MockRole = formData.get("role") === "curator" ? "curator" : "commune";
    const store = await cookies();
    store.set(MOCK_ROLE_COOKIE, next, { path: "/", maxAge: 31_536_000, sameSite: "lax" });
    revalidatePath("/", "layout");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Repeat2 aria-hidden className="size-3" />
        Ansicht wechseln (Demo)
      </span>
      <form action={switchRole} className="flex gap-1">
        {ROLES.map((option) => (
          <button
            key={option}
            type="submit"
            name="role"
            value={option}
            aria-pressed={option === role}
            className={cn(
              "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              option === role
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {MOCK_ROLE_PROFILES[option].switchLabel}
          </button>
        ))}
      </form>

      {/* Unmistakable mock signal: never let demo data pass for a live backend.
          It sits with the other demo controls rather than in the header, so
          everything that only exists for the demo is in one place. */}
      {isMockMode() ? (
        <span className="mt-1 flex w-fit items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-500">
          <FlaskConical className="size-3.5" />
          Mock-Modus · Demo-Daten
        </span>
      ) : null}
    </div>
  );
}
