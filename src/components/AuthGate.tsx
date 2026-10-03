import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Coffee } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { api, type PublicTenant } from "../lib/api";
import { parseJoinSlug, type JoinedTenant } from "../lib/model";
import { clearUserData, keys, readJson, removeKey, writeJson } from "../lib/storage";
import { SignInScreen } from "./SignInScreen";
import { Shell } from "./Shell";

const LoyaltyStampPass = lazy(() => import("../pass/LoyaltyStampPass"));

type Phase = { kind: "loading" } | { kind: "signed_out"; notice?: string } | { kind: "ready"; session: Session };

function rememberJoin(tenant: PublicTenant) {
  const list = (readJson<JoinedTenant[]>(keys.joined) ?? []).filter((j) => j.tenant.slug !== tenant.slug);
  writeJson(keys.joined, [{ tenant, joinedAt: Date.now() }, ...list].slice(0, 20));
}

const Loading = ({ text }: { text: string }) => (
  <Shell icon={<Coffee className="w-5 h-5 text-white animate-pulse" />} title="Loyalty Pass" subtitle={text}>
    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
      <div className="h-full w-1/3 bg-cyan-400 rounded-full animate-pulse" />
    </div>
  </Shell>
);

export function AuthGate() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [joinTenant, setJoinTenant] = useState<PublicTenant | null>(null);
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  const joinSlug = useRef(parseJoinSlug(window.location.pathname));

  // Invite link: public branding lookup works before sign-in (anon RPC).
  useEffect(() => {
    const slug = joinSlug.current;
    if (!slug) return;
    let cancelled = false;
    api
      .publicTenant(slug)
      .then((t) => {
        if (cancelled || !t) return;
        setJoinTenant(t);
        setFocusSlug(t.slug);
        rememberJoin(t);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        setPhase((prev) => {
          if (!session) return prev.kind === "signed_out" ? prev : { kind: "signed_out" };
          if (prev.kind === "ready" && prev.session.user.id === session.user.id) return { kind: "ready", session };
          return { kind: "ready", session };
        });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Once signed in, drop the /join/... path (keep the selection focus).
  useEffect(() => {
    if (phase.kind === "ready" && window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
  }, [phase.kind]);

  const signOut = useCallback(async (notice?: string) => {
    const uid = phase.kind === "ready" ? phase.session.user.id : null;
    await supabase.auth.signOut();
    if (uid) clearUserData(uid);
    removeKey(keys.joined); // shared phones: the next person starts clean
    setPhase({ kind: "signed_out", notice });
  }, [phase]);

  if (phase.kind === "loading") return <Loading text="Opening your pass..." />;
  if (phase.kind === "signed_out") return <SignInScreen joinTenant={joinTenant} notice={phase.notice} />;
  return (
    <Suspense fallback={<Loading text="Loading your cards..." />}>
      <LoyaltyStampPass
        key={phase.session.user.id}
        userId={phase.session.user.id}
        email={phase.session.user.email ?? ""}
        focusSlug={focusSlug}
        onSignOut={signOut}
      />
    </Suspense>
  );
}
