import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

const { DISCORD_CLIENT_ID = '1569520017224106054', DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, VIP_PUBLIC_URL, PORT = '8787', VIP_CORS_ORIGIN = 'http://tauri.localhost', DISCORD_GUILD_ID = '1551126395432861708', DISCORD_VIP_ROLE_ID = '1558801424396058755' } = process.env;
if (!DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI || !VIP_PUBLIC_URL) {
  console.error('Set DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, and VIP_PUBLIC_URL before starting VIP service.');
  process.exit(1);
}
const random = () => randomBytes(32).toString('base64url');
const connections = new Map();
const states = new Map();
const DAY = 24 * 60 * 60 * 1000;
const now = () => Date.now();
const allowedOrigins = new Set(VIP_CORS_ORIGIN.split(',').map(x => x.trim()).filter(Boolean));
function json(res, status, data) { res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}); res.end(JSON.stringify(data)); }
function cors(req, res) { const origin = req.headers.origin; if (origin && allowedOrigins.has(origin)) { res.setHeader('access-control-allow-origin', origin); res.setHeader('vary','Origin'); } res.setHeader('access-control-allow-methods','GET, POST, OPTIONS'); res.setHeader('access-control-allow-headers','content-type'); }
async function oauthToken(params) {
  const response = await fetch('https://discord.com/api/v10/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({client_id:DISCORD_CLIENT_ID, client_secret:DISCORD_CLIENT_SECRET, ...params}) });
  if (!response.ok) throw new Error('Discord token exchange failed');
  return await response.json();
}
async function discordGet(path, access) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {headers:{authorization:`Bearer ${access}`},signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error(`Discord verification error HTTP ${response.status}`);
  return response.json();
}
async function refreshConnection(c) {
  if (c.accessExpires < now() + 60000) {
    const next = await oauthToken({grant_type:'refresh_token',refresh_token:c.refreshToken});
    c.accessToken = next.access_token; c.refreshToken = next.refresh_token;
    c.accessExpires = now() + next.expires_in * 1000;
  }
  const member = await discordGet(`/users/@me/guilds/${DISCORD_GUILD_ID}/member`, c.accessToken);
  c.vip = Array.isArray(member.roles) && member.roles.includes(DISCORD_VIP_ROLE_ID);
}
function page(res, status, title, body) {res.writeHead(status, {'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'"});res.end(`<!doctype html><meta charset="utf-8"><title>${title}</title><main style="font-family:system-ui;max-width:540px;margin:15vh auto;padding:25px"><h1>${title}</h1><p>${body}</p><p>You may return to Mayham Accounts.</p></main>`);}
createServer(async(req,res)=>{
  cors(req,res);
  if (req.method === 'OPTIONS') {res.writeHead(204); return res.end();}
  const origin = req.headers.origin;
  // Reject browser requests from unauthorised web origins, including POSTs.
  if (origin && !allowedOrigins.has(origin)) return json(res,403,{error:'Origin not allowed'});
  const url = new URL(req.url, VIP_PUBLIC_URL);
  try {
    if (req.method === 'POST' && url.pathname === '/api/start') {
      const session=random(); const state=random();
      connections.set(session,{state,created:now(),status:'pending',expires:now()+14*DAY});
      states.set(state,session);
      const auth=new URL('https://discord.com/oauth2/authorize');
      for(const [k,v] of Object.entries({client_id:DISCORD_CLIENT_ID,redirect_uri:DISCORD_REDIRECT_URI,response_type:'code',scope:'identify guilds.members.read',state,prompt:'consent'}))auth.searchParams.set(k,v);
      return json(res,200,{session,authorizeUrl:auth.toString()});
    }
    if (req.method === 'GET' && url.pathname === '/oauth/callback') {
      const state=url.searchParams.get('state');const code=url.searchParams.get('code');
      const session=state && states.get(state); if (state) states.delete(state);
      const c=session && connections.get(session);
      if (!c || !code || c.status !== 'pending' || now()-c.created>10*60*1000) return page(res,400,'Connection expired','Please start Discord connection again from Mayham Accounts.');
      const token=await oauthToken({grant_type:'authorization_code',code,redirect_uri:DISCORD_REDIRECT_URI});
      const profile=await discordGet('/users/@me',token.access_token);
      c.accessToken=token.access_token;c.refreshToken=token.refresh_token;c.accessExpires=now()+token.expires_in*1000;c.userId=profile.id;c.username=profile.username;c.displayName=profile.global_name||profile.username;c.avatar=profile.avatar ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(profile.id)}/${encodeURIComponent(profile.avatar)}.${profile.avatar.startsWith("a_") ? "gif" : "png"}?size=128` : null;
      c.status='connected';
      try {await refreshConnection(c);} catch {c.vip=false;}
      return page(res,200,'Discord connected','Mayham Accounts can now check your Patreon VIP role.');
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const session=url.searchParams.get('session');const c=session && connections.get(session);
      if (!c || c.expires<now()) return json(res,401,{error:'Session expired. Reconnect Discord.'});
      if(c.status==='pending')return json(res,200,{status:'pending'});
      // Fail closed: if Discord cannot be checked, do not grant VIP.
      try {await refreshConnection(c);} catch {return json(res,503,{error:'Could not verify the current Discord VIP role; retry shortly.'});}
      return json(res,200,{status:c.vip?'vip':'free',username:c.username,displayName:c.displayName,avatar:c.avatar,userId:c.userId});
    }
    return json(res,404,{error:'Not found'});
  }catch(e){console.error('VIP service error',e);return json(res,500,{error:'VIP service could not complete request'});}
}).listen(Number(PORT),'0.0.0.0',()=>console.log(`Mayham VIP service listening on port ${PORT}`));
setInterval(()=>{for(const [key,value] of connections)if(value.expires<now())connections.delete(key);for(const [key,session] of states)if(!connections.has(session))states.delete(key);},60*60*1000).unref();
