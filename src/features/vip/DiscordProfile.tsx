import { useDiscordIdentity } from "./discordIdentity";
import { Icon } from "../../ui/Icon";
import "./discordProfile.css";
export function DiscordProfile({onVip}: {onVip: () => void}) {
  const {member,session,connect,busy,configured} = useDiscordIdentity();
  const linked = member?.status === "free" || member?.status === "vip";
  return <aside className="mayham-discord-profile" aria-label="Discord profile">
    {linked ? <button className="mayham-discord-profile-main" onClick={onVip} title="Open VIP membership">
      {member.avatar ? <img className="mayham-discord-avatar" src={member.avatar} alt="Discord avatar" referrerPolicy="no-referrer" /> : <span className="mayham-discord-avatar mayham-discord-avatar-empty"><Icon name="discord" size={23}/></span>}
      <span className="mayham-discord-profile-names"><strong>{member.displayName || member.username || "Discord user"}</strong><small>@{member.username || "unknown"}</small></span>
      {member.status === "vip" && <span className="mayham-vip-crown" title="VIP verified"><Icon name="crown"/></span>}
    </button> : <button className="mayham-discord-profile-main" disabled={busy} onClick={() => configured ? void connect() : onVip()}>
      <span className="mayham-discord-avatar mayham-discord-avatar-empty"><Icon name="discord" size={23}/></span>
      <span className="mayham-discord-profile-names"><strong>{busy ? "Opening Discord…" : session ? "Finish Discord Linking" : "Link Discord Here"}</strong><small>{configured ? "Connect your Discord account" : "Set up Discord linking"}</small></span>
    </button>}
  </aside>;
}
