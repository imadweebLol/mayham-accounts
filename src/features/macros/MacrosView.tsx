import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./macros.css";

type Macro = { id: string; name: string; path: string; format: string; added: string; collection?: string; favourite?: boolean };
type Collection = {id:string; name:string};
const COLLECTIONS_KEY = "mayham.macroCollections.v1";
function loadCollections(): Collection[] {try {const list:unknown=JSON.parse(localStorage.getItem(COLLECTIONS_KEY)||"[]");return Array.isArray(list)?list.filter((x):x is Collection=>!!x&&typeof x==="object"&&typeof x.id==="string"&&typeof x.name==="string"):[];}catch{return [];}}
type OfficialMacro = { id: string; name: string; version: string; description: string; format: string; requires?: string; path: string; sha256: string; author: string };
const KEY = "mayham.userMacros.v1";
const OFFICIAL_REPO = "https://github.com/imadweebLol/Macro-Mayham-Macros";
const FORMATS: Record<string,string> = { ahk: "AutoHotkey", rec: "TinyTask", pmc: "Pulover's Macro Creator", au3: "AutoIt", mcr: "Macro Recorder", mmacro: "Macro Recorder", py: "Python automation" };
function load(): Macro[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value.filter((v): v is Macro => typeof v === "object" && v !== null && typeof v.path === "string" && typeof v.name === "string") : []; }
  catch { return []; }
}
function repoParts(value: string): { owner: string; repo: string } | null {
  const match = value.trim().match(/^(?:https:\/\/github\.com\/)?([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\.git)?\/?$/i);
  if (!match) return null;
  return {owner:match[1], repo:match[2].replace(/\.git$/i, "")};
}
function safePath(path: string): boolean {
  return /^macros\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(path) && !path.split("/").includes("..") && !path.includes("//");
}
function validMacro(item: unknown): item is OfficialMacro {
  if (!item || typeof item !== "object") return false;
  const m = item as Record<string,unknown>;
  return typeof m.id === "string" && m.id.length < 120 && typeof m.name === "string" && m.name.length < 200 && typeof m.version === "string" && typeof m.description === "string" && typeof m.format === "string" && FORMATS[m.format] !== undefined && typeof m.path === "string" && safePath(m.path) && m.path.toLowerCase().endsWith("."+m.format.toLowerCase()) && typeof m.sha256 === "string" && /^[0-9a-f]{64}$/i.test(m.sha256) && typeof m.author === "string";
}
export function MacrosView() {
  const [items,setItems] = useState<Macro[]>(load);
  const [collections,setCollections] = useState<Collection[]>(loadCollections);
  const [collectionName,setCollectionName] = useState("");
  const [collectionFilter,setCollectionFilter] = useState("all");
  const [message,setMessage] = useState("");
  const repo = OFFICIAL_REPO;
  const [official,setOfficial] = useState<OfficialMacro[]>([]);
  const [loading,setLoading] = useState(false);
  const [officialError,setOfficialError] = useState("");
  const save=(next:Macro[])=>{setItems(next);localStorage.setItem(KEY,JSON.stringify(next));};
  const saveCollections=(next:Collection[])=>{setCollections(next);localStorage.setItem(COLLECTIONS_KEY,JSON.stringify(next));};
  const makeCollection=()=>{const name=collectionName.trim().slice(0,70);if(!name||collections.some(c=>c.name.toLowerCase()===name.toLowerCase()))return;saveCollections([...collections,{id:crypto.randomUUID(),name}]);setCollectionName("");};
  const removeCollection=(id:string)=>{saveCollections(collections.filter(c=>c.id!==id));save(items.map(m=>m.collection===id?{...m,collection:undefined}:m));if(collectionFilter===id)setCollectionFilter("all");};
  const visible=items.filter(item=>collectionFilter==="all"||collectionFilter==="favourites"&&item.favourite||item.collection===collectionFilter);
  const refresh=async()=>{
    const parts=repoParts(repo);
    if (!parts){setOfficialError("Official GitHub repository configuration is invalid.");setOfficial([]);return;}
    setLoading(true);setOfficialError("");
    try {
      const response = await fetch(`https://raw.githubusercontent.com/${parts.owner}/${parts.repo}/main/catalog.json`,{cache:"no-store"});
      if (!response.ok) throw new Error(`Could not load catalog.json (HTTP ${response.status}). Ensure the repository is public, uses the main branch, and the file is at its root.`);
      const data: unknown=await response.json();
      if(!data || typeof data!=="object" || !Array.isArray((data as {macros?: unknown}).macros)) throw new Error("Invalid catalog: expected a macros array.");
      const macros=(data as {macros:unknown[]}).macros;
      if(macros.length>200) throw new Error("Catalog is too large.");
      if(!macros.every(validMacro)) throw new Error("The catalog contains an invalid macro entry (path, format or SHA-256). ");
      setOfficial(macros);
    } catch (err) {setOfficial([]);setOfficialError(String(err));}
    finally {setLoading(false);}
  };
  useEffect(()=>{void refresh(); /* load the official public catalog automatically when opening the tab */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const download=async(m:OfficialMacro)=>{
    const parts=repoParts(repo);
    if(!parts || !safePath(m.path)) return;
    // Open the GitHub file page: the user consciously selects Raw/Download and no macro is executed.
    try {await openUrl(`https://github.com/${parts.owner}/${parts.repo}/blob/main/${m.path.split("/").map(encodeURIComponent).join("/")}`);}
    catch(e){setOfficialError(`Unable to open the download: ${String(e)}`);}
  };
  const add=async()=>{
    try {
      const picked=await open({multiple:true,directory:false,title:"Import macros",filters:[{name:"Macro files",extensions:Object.keys(FORMATS)}]});
      if(!picked) return;
      const paths=Array.isArray(picked)?picked:[picked];
      const next=[...items];let count=0;
      for(const path of paths) {
        const name=path.split(/[\\/]/).pop()||path;
        const ext=name.split(".").pop()?.toLowerCase()||"";
        if(!FORMATS[ext] || next.some(m=>m.path===path)) continue;
        next.push({id:`${Date.now()}-${count}`,name,path,format:FORMATS[ext],added:new Date().toLocaleDateString()});count++;
      }
      save(next);setMessage(count ? `Imported ${count} macro reference(s). Files stay in their original locations.` : "No new supported files were found.");
    }catch(e){setMessage(`Import failed: ${String(e)}`);}
  };
  return <main className="mayham-macros page" aria-label="Macro Mayham Macros">
    <header className="mayham-macros-head"><div><h1 className="page-title">Macro Mayham Macros</h1><p className="page-sub">Official releases and your own automation files, all in one place.</p></div><button className="mayham-primary" onClick={()=>void add()}>+ Import your macros</button></header>
    <section className="panel mayham-macro-panel">
      <h2>Official Macro Mayham Macros ({official.length})</h2>
      <p className="page-sub">Official releases are loaded automatically from Macro Mayham on GitHub. Select Refresh to check for new releases without rebuilding the app.</p>
      <div className="mayham-macro-repo"><span>Source: Macro Mayham official GitHub library</span><button disabled={loading} onClick={()=>void refresh()}>{loading?"Refreshing...":"Refresh Official Macros"}</button></div>
      {officialError&&<p className="mayham-message" role="alert">{officialError}</p>}
      {official.length===0&&!loading&&!officialError&&<div className="mayham-macro-empty">No official macros available yet. The library refreshes automatically; select Refresh to check again.</div>}
      {official.length>0&&<div className="mayham-macro-list">{official.map(m=><div className="mayham-macro-row" key={m.id}><div><strong>{m.name} <small>v{m.version}</small></strong><small>{m.description}</small><small>{FORMATS[m.format]} · {m.author} · Requires {m.requires||"compatible macro software"}</small><small title={m.sha256}>SHA-256: {m.sha256}</small></div><button onClick={()=>void download(m)}>View / Download</button></div>)}</div>}
    </section>
    <section className="panel mayham-macro-panel"><h2>Macro Collections — Free for everyone</h2><p className="page-sub">Organise imported macros into folders or mark them as favourites. No Discord or Patreon required.</p>
      <div className="mayham-collections-create"><input aria-label="New collection name" value={collectionName} maxLength={70} placeholder="New collection name" onChange={e=>setCollectionName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")makeCollection();}}/><button disabled={!collectionName.trim()} onClick={makeCollection}>Create Collection</button></div>
      <div className="mayham-collections-list">{collections.map(c=><div key={c.id} className="mayham-collections-item"><button onClick={()=>setCollectionFilter(c.id)}>{c.name} ({items.filter(m=>m.collection===c.id).length})</button><button onClick={()=>{const name=window.prompt("Rename collection",c.name)?.trim().slice(0,70);if(name)saveCollections(collections.map(x=>x.id===c.id?{...x,name}:x));}}>Rename</button><button onClick={()=>removeCollection(c.id)}>Delete</button></div>)}</div>
    </section>
    <section className="panel mayham-macro-panel"><h2>My Macros ({items.length})</h2>
      <label className="mayham-filter-label">Show collection <select value={collectionFilter} onChange={e=>setCollectionFilter(e.target.value)}><option value="all">All Macros</option><option value="favourites">Favourites</option>{collections.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="page-sub">Supported imports: AutoHotkey (.ahk), TinyTask (.rec), Pulover (.pmc), AutoIt (.au3), Macro Recorder (.mcr/.mmacro), and Python (.py).</p>
      {items.length===0?<div className="mayham-macro-empty">You haven't imported any macros yet. Use “Import your macros” to add files from your computer.</div>:<div className="mayham-macro-list">{visible.map(item=><div className="mayham-macro-row" key={item.id}><div><strong>{item.name}</strong><small>{item.format} · Added {item.added}</small><small title={item.path}>{item.path}</small></div><div className="mayham-macro-actions"><select aria-label={`Collection for ${item.name}`} value={item.collection||""} onChange={e=>save(items.map(x=>x.id===item.id?{...x,collection:e.target.value||undefined}:x))}><option value="">No collection</option>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={()=>save(items.map(x=>x.id===item.id?{...x,favourite:!x.favourite}:x))}>{item.favourite?"★ Favourite":"☆ Favourite"}</button><button onClick={()=>save(items.filter(x=>x.id!==item.id))} aria-label={`Remove ${item.name}`}>Remove</button></div></div>)}</div>}
      <p className="mayham-macro-warning">Official macros are displayed from the GitHub catalog. Viewing or importing a macro never executes it. Only run scripts from sources you trust and review what they do. Verify SHA-256 before executing downloaded files.</p>
      {message&&<p role="status" className="mayham-message">{message}</p>}
    </section>
  </main>;
}
