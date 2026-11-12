import { useState } from 'react';
import { open as openFile } from '@tauri-apps/plugin-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { qk } from '../../data';
import { loadMayhamTheme, MAYHAM_DEFAULT, MAYHAM_PRESETS, loadSavedMayhamPresets, saveSavedMayhamPresets, saveMayhamTheme, type MayhamTheme, type SavedMayhamPreset } from '../../app/mayhamThemes';
import './mayham-theme-studio.css';

export function MayhamThemeStudio() {
  const [tab,setTab]=useState<'presets'|'custom'>('presets');
  const [settings,setSettings]=useState<MayhamTheme>(loadMayhamTheme);
  const [saved,setSaved]=useState<SavedMayhamPreset[]>(loadSavedMayhamPresets);
  const [hiddenBuiltins,setHiddenBuiltins]=useState<string[]>(()=>{try {const v=JSON.parse(localStorage.getItem('mayham.hiddenBuiltins.v1')||'[]') as unknown;return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];} catch{return []}});
  const hideBuiltin=(id:string)=>{const next=[...hiddenBuiltins,id];setHiddenBuiltins(next);localStorage.setItem('mayham.hiddenBuiltins.v1',JSON.stringify(next));};
  const restoreBuiltins=()=>{setHiddenBuiltins([]);localStorage.removeItem('mayham.hiddenBuiltins.v1');};
  const [name,setName]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const client=useQueryClient();
  const change=(patch:Partial<MayhamTheme>) => {
    const next={...settings,...patch};
    setSettings(next);
    saveMayhamTheme(next);
  };
  const reloadBackground=async()=>{await client.invalidateQueries({queryKey:qk.background});};
  const upload=async()=>{
    try {
      const chosen=await openFile({ multiple:false,directory:false, filters:[{name:'Background images',extensions:['png','jpg','jpeg','webp','gif']}], title:'Choose your own background image' });
      if(!chosen) return;
      setBusy(true);
      await api.backgroundSet(chosen);
      await reloadBackground();
      change({backgroundPath:chosen});
      setMessage('Your image is now the background. Save this as a preset to preserve a copy with the theme.');
    } catch(error) { setMessage(`Could not apply image: ${String(error)}`); }
    finally { setBusy(false); }
  };
  const clearBackground=async()=>{
    setBusy(true);
    try {await api.backgroundClear();await reloadBackground();change({backgroundPath:undefined});setMessage('Background removed.');}
    catch(error){setMessage(`Could not remove background: ${String(error)}`);}
    finally {setBusy(false);}
  };
  const savePreset=async()=>{
    const title=name.trim();
    if(!title) {setMessage('Enter a name for your preset first.');return;}
    if(title.length>48) {setMessage('Keep the preset name under 49 characters.');return;}
    const id=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
    setBusy(true);
    try {
      await api.mayhamPresetBackgroundSave(id);
      const next=[...saved,{id,name:title,theme:{...settings},createdAt:new Date().toISOString()}];
      saveSavedMayhamPresets(next);setSaved(next);setName('');setMessage(`Saved “${title}” with its current background.`);
    } catch(error) {setMessage(`Could not save preset: ${String(error)}`);}
    finally {setBusy(false);}
  };
  const applyPreset=async(preset:SavedMayhamPreset)=>{
    setBusy(true);
    try {await api.mayhamPresetBackgroundRestore(preset.id);await reloadBackground();change({...MAYHAM_DEFAULT,...preset.theme});setMessage(`Applied “${preset.name}”.`);}
    catch(error) {setMessage(`Could not restore preset: ${String(error)}`);}
    finally {setBusy(false);}
  };
  const removePreset=async(preset:SavedMayhamPreset)=>{
    if(!window.confirm(`Delete saved preset “${preset.name}”? This will not delete your original image file.`))return;
    setBusy(true);
    try {await api.mayhamPresetBackgroundDelete(preset.id);const next=saved.filter(p=>p.id!==preset.id);setSaved(next);saveSavedMayhamPresets(next);setMessage(`Deleted preset “${preset.name}”.`);}
    catch(error) {setMessage(`Could not remove preset: ${String(error)}`);}
    finally {setBusy(false);}
  };
  return <section className="mayham-studio" aria-label="Mayham themes">
    <div className="mayham-studio-header">
      <img src="/mayham-logo.png" alt="Mayham Accounts" />
      <div><h2>Mayham Theme Studio</h2><p>Mix themes, choose the whole menu style, and upload backgrounds from your own computer.</p></div>
    </div>
    <div className="mayham-tabs" role="tablist" aria-label="Theme studio tabs">
      <button type="button" role="tab" aria-selected={tab==='presets'} className={tab==='presets'?'selected':''} onClick={()=>setTab('presets')}>Preset Themes</button>
      <button type="button" role="tab" aria-selected={tab==='custom'} className={tab==='custom'?'selected':''} onClick={()=>setTab('custom')}>Custom Themes</button>
    </div>
    {tab==='presets'? <>
      <h3>Menu layout</h3>
      <div className="mayham-actions"><button type="button" aria-pressed={settings.layout!=='roalt'} onClick={()=>change({layout:'solid',bubbles:false})}>Mayham Solid {settings.layout!=='roalt'?'✓':''}</button><button type="button" aria-pressed={settings.layout==='roalt'} onClick={()=>change({layout:'roalt',bubbles:true})}>Mayham Classic + Bubbles {settings.layout==='roalt'?'✓':''}</button></div>
      <h3>Built-in Presets</h3><p className="mayham-caption">Apply any theme, or hide presets you don't use. Hidden built-ins can be restored anytime.</p>
      <div className="mayham-actions"><button type="button" onClick={restoreBuiltins} disabled={hiddenBuiltins.length===0}>Restore hidden presets ({hiddenBuiltins.length})</button></div>
      <div className="mayham-theme-grid">
        {MAYHAM_PRESETS.filter(p=>!hiddenBuiltins.includes(p.id)).map(p=><div key={p.id} className={`mayham-preset ${settings.surface===p.id && settings.accent===p.id?'active':''}`}>
          <button type="button" className="mayham-builtin-pick" aria-pressed={settings.surface===p.id && settings.accent===p.id} onClick={()=>change({surface:p.id,accent:p.id,useCustomAccent:false})}>
            <div className="mayham-preview" style={{background:`linear-gradient(135deg,${p.panel},${p.accent})`}}><span className="mayham-mini-rail" style={{background:p.ground}}/><span className="mayham-mini-content"><i style={{background:p.ground}}/><b style={{background:p.panel,borderTop:`4px solid ${p.accent}`}}/><b style={{background:p.panel}}/></span></div><strong>{p.name}</strong><small>{p.detail}</small>
          </button>
          <button type="button" className="mayham-hide" onClick={()=>hideBuiltin(p.id)} aria-label={`Remove ${p.name} from presets`}>Remove</button>
        </div>)}
      </div>
      <h3>My Saved Presets ({saved.length})</h3>
      {saved.length===0?<p className="mayham-caption">No personal presets yet. Customise your theme, then choose “Save as preset”.</p>:<div className="mayham-saved-grid">{saved.map(p=><div className="mayham-saved-card" key={p.id}><strong>{p.name}</strong><small>{p.theme.layout==='roalt'?'Mayham classic':'Mayham solid'} · {new Date(p.createdAt).toLocaleDateString()}</small><div className="mayham-actions"><button type="button" disabled={busy} onClick={()=>void applyPreset(p)}>Apply</button><button type="button" disabled={busy} onClick={()=>void removePreset(p)}>Delete</button></div></div>)}</div>}
    </>: <>
      <h3>Custom Theme Editor</h3><p className="mayham-caption">Control the entire menu appearance. The current matte Mayham layout remains the default.</p>
      <div className="mayham-controls">
        <label>Menu style / layout <select value={settings.layout ?? 'solid'} onChange={e=>change({layout:e.target.value as 'solid'|'roalt'})}><option value="solid">Mayham — solid, modern menu</option><option value="roalt">Mayham — classic liquid menu</option></select></label>
        <label className="mayham-toggle">Bubble movement / liquid selection <input type="checkbox" checked={settings.bubbles ?? false} onChange={e=>change({bubbles:e.target.checked})} disabled={settings.layout!=='roalt'}/><span>{settings.layout==='roalt'?'Enable or disable the original bubble selection effects':'Select Mayham Classic layout to enable bubbles'}</span></label>
        <label>Base / panel style <select value={settings.surface} onChange={e=>change({surface:e.target.value})}>{MAYHAM_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Accent style <select value={settings.accent} onChange={e=>change({accent:e.target.value,useCustomAccent:false})}>{MAYHAM_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="mayham-color-row">Use custom accent <input type="checkbox" checked={settings.useCustomAccent} onChange={e=>change({useCustomAccent:e.target.checked})}/><input type="color" aria-label="Custom accent" value={settings.customAccent} onChange={e=>change({customAccent:e.target.value,useCustomAccent:true})}/></label>
        <label>Corner roundness <span>{settings.radius}px</span><input type="range" min="4" max="30" value={settings.radius} onChange={e=>change({radius:Number(e.target.value)})}/></label>
        <label>Neon glow intensity <span>{settings.glow}%</span><input type="range" min="0" max="100" value={settings.glow} onChange={e=>change({glow:Number(e.target.value)})}/></label>
        <label>Surface transparency <span>{settings.transparency}%</span><input type="range" min="0" max="65" value={settings.transparency} onChange={e=>change({transparency:Number(e.target.value)})}/></label>
      </div>
      <div className="mayham-actions"><button type="button" disabled={busy} onClick={()=>void upload()}>{busy?'Working…':'Upload my background image'}</button><button type="button" disabled={busy} onClick={()=>void clearBackground()}>Remove background</button><button type="button" onClick={()=>change(MAYHAM_DEFAULT)}>Restore Mayham default</button></div>
      <div className="mayham-save-box"><label htmlFor="mayham-preset-name">Save your entire theme as a preset</label><div className="mayham-save-row"><input id="mayham-preset-name" value={name} maxLength={48} placeholder="My purple setup" onChange={e=>setName(e.target.value)}/><button type="button" disabled={busy} onClick={()=>void savePreset()}>Save as preset</button></div><p className="mayham-caption">A copy of your current background is stored inside the application for each saved preset.</p></div>
      {message&&<p role="status" className="mayham-caption">{message}</p>}
    </>}
    {tab==='presets'&&message&&<p role="status" className="mayham-caption">{message}</p>}
  </section>;
}
