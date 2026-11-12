import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

export const VIP_API = (import.meta.env.VITE_MAYHAM_VIP_API_URL || "").replace(/\/$/, "");
export const DISCORD_SESSION = "mayham.vip.session.v1";
export type DiscordMember = { status: "pending" | "free" | "vip" | "expired"; username?: string; displayName?: string; avatar?: string | null; userId?: string };
type LoginResponse = { session: string; authorizeUrl: string };
export async function vipRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!VIP_API) throw new Error("Discord identity service isn't configured yet.");
  const res = await fetch(`${VIP_API}${path}`, { cache: "no-store", ...init });
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Discord service returned ${res.status}`);
  return data;
}
export function useDiscordIdentity() {
  const [session, setSession] = useState(() => localStorage.getItem(DISCORD_SESSION) || "");
  const [member, setMember] = useState<DiscordMember | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const update = () => { setSession(localStorage.getItem(DISCORD_SESSION) || ""); setMember(null); };
    window.addEventListener("mayham-discord-session", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("mayham-discord-session", update); window.removeEventListener("storage", update); };
  }, []);
  useEffect(() => {
    if (!session || !VIP_API) return;
    let live = true;
    const poll = async () => {
      try {
        const next = await vipRequest<DiscordMember>(`/api/status?session=${encodeURIComponent(session)}`);
        if (live) { setMember(next); setError(""); }
      } catch (e) { if (live) { setMember(null); setError(String(e)); } }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 12000);
    return () => {live = false; window.clearInterval(timer);};
  }, [session]);
  const connect = async () => {
    if (!VIP_API) {setError("Discord linking needs the VIP service URL configured by the app owner.");return;}
    setBusy(true);setError("");
    try {
      const next = await vipRequest<LoginResponse>("/api/start", { method: "POST" });
      // Open authorisation before storing the pairing session; a failed launch must be recoverable.
      await openUrl(next.authorizeUrl);
      localStorage.setItem(DISCORD_SESSION, next.session);
      window.dispatchEvent(new Event("mayham-discord-session"));
    } catch(e) {setError(String(e));} finally {setBusy(false);}
  };
  const disconnect = () => {localStorage.removeItem(DISCORD_SESSION);window.dispatchEvent(new Event("mayham-discord-session"));setError("");};
  return {session, member, error, busy, connect, disconnect, configured: !!VIP_API};
}
