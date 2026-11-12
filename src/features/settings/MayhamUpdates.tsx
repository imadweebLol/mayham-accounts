import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { qk } from '../../data';

/** The update check uses the fork's own configured, signed releases only. */
export function MayhamUpdates() {
  const [busy,setBusy] = useState(false);
  const [available,setAvailable] = useState<string | null>(null);
  const [message,setMessage] = useState('No update available right now.');
  const qc = useQueryClient();
  const check=async()=>{
    setBusy(true);
    try {
      const result=await api.selfUpdateCheck();
      setAvailable(result.available);
      qc.setQueryData(qk.appUpdate,result);
      setMessage(result.available ? `Mayham Accounts ${result.available} is available to install.` : 'No update available right now.');
    } catch(e){setMessage(`Could not check for updates: ${String(e)}`);}
    finally{setBusy(false);}
  };
  const install=async()=>{
    if (!available || !window.confirm(`Install the signed Mayham Accounts ${available} update now? The application will close during installation.`)) return;
    setBusy(true);
    try {await api.selfUpdateInstall();}
    catch(e){setMessage(`Update was not installed: ${String(e)}`);setBusy(false);}
  };
  return <section className="panel mayham-about-card" aria-labelledby="mayham-updates-title">
    <p className="mayham-eyebrow">MAYHAM ACCOUNTS UPDATES</p><h2 id="mayham-updates-title">Updates inside the app</h2>
    <p>Check for new Mayham Accounts versions here. When a signed release is published, you can install it without manually downloading a replacement installer.</p>
    <div className="mayham-credit-actions"><button type="button" disabled={busy} onClick={()=>void check()}>{busy?'Checking…':'Check for updates'}</button>{available&&<button type="button" disabled={busy} onClick={()=>void install()}>Install v{available}</button>}</div>
    <p role="status" style={{marginTop:14}}>{message}</p>
  </section>;
}
