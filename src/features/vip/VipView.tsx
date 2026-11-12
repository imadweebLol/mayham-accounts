import { openUrl } from "@tauri-apps/plugin-opener";
import { useDiscordIdentity } from "./discordIdentity";
import { Icon } from "../../ui/Icon";
import "./vip.css";

const FEATURES = [
  ["Exclusive Themes", "VIP-only animated styles and theme packs"],
  ["Advanced Macro Profiles", "Save and switch complete macro configurations"],
  ["Early Access", "Preview upcoming Mayham builds"],
  ["Advanced Launcher Presets", "Reusable game and account launch setups"],
  ["VIP Discord Role", "Managed automatically by your Patreon membership"],
  ["VIP Feature Voting", "Vote on upcoming development priorities"],
  ["VIP Profile Customisation", "Badges, colours and profile effects"],
];
export function VipView() {
 const {member,session,connect,disconnect,error,busy,configured} = useDiscordIdentity();
 const vip = member?.status === "vip";
 const communityUrl = import.meta.env.VITE_MAYHAM_DISCORD_INVITE_URL || "https://discord.com/channels/@me";
 return <main className="mayham-vip page" aria-label="Mayham VIP">
  <header className="mayham-vip-head"><div><h1 className="page-title"><Icon name="crown" size={26}/> Mayham VIP</h1><p className="page-sub">VIP status is checked using your linked Discord account.</p></div><span className="mayham-vip-tag">{vip ? "VIP Verified" : "VIP Locked"}</span></header>
  <section className="panel mayham-vip-panel">
   <h2>{vip ? "VIP Access Granted" : "Unlock VIP"}</h2>
   {vip ? <p role="status">Your Discord VIP role is verified. Welcome, {member?.displayName || member?.username || "member"}!</p> : <><p className="mayham-vip-note" role="status">Head to the Discord server and pay there to unlock VIP features.</p><button className="mayham-vip-button" onClick={()=>void openUrl(communityUrl)}>Open Discord</button></>}
   <div className="mayham-vip-link-section">
    {member?.username ? <p>Linked Discord: <strong>{member.displayName || member.username}</strong> <small>@{member.username}</small></p> : session && member?.status === "pending" ? <p>Waiting for Discord authorisation in your browser…</p> : <p>Link Discord to automatically check your membership. No bot message or verification code is required.</p>}
    {!configured && <p className="mayham-vip-note">Discord linking isn't configured yet. The app owner must deploy the VIP service and set VITE_MAYHAM_VIP_API_URL before building.</p>}
    {!member?.username && <button className="mayham-vip-button" disabled={busy || !configured} onClick={()=>void connect()}>{busy ? "Opening Discord…" : session ? "Retry Link Discord" : "Link Discord Here"}</button>}
    {session && <button className="mayham-vip-secondary" onClick={disconnect}>Unlink Discord</button>}
    {error && <p className="mayham-vip-error" role="alert">{error}</p>}
   </div>
  </section>
  <section className="panel mayham-vip-panel"><h2>VIP Benefits</h2><p className="page-sub">Some benefits are planned, rather than implemented yet.</p><div className="mayham-vip-grid">{FEATURES.map(([name,desc])=><article className="mayham-vip-feature" key={name}><strong>{name}</strong><p>{desc}</p><small>{vip ? "VIP verified · Feature planned" : "VIP · Locked"}</small></article>)}</div></section>
  <section className="panel mayham-vip-panel"><h2>Always free</h2><p>Standard accounts, Browse, launcher, themes and macros remain free.</p></section>
 </main>;
}
