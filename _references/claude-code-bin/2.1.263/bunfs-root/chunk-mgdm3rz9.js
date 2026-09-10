// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{j,U,aye}from"/$bunfs/root/chunk-k6vqz9fa.js";import{O}from"/$bunfs/root/chunk-m3vzz9tz.js";import{Ise,ee,yTe}from"/$bunfs/root/chunk-32f2qmtc.js";import{da}from"/$bunfs/root/chunk-v7vff0yy.js";import{Bkt,mUe,qkt,HQ,wQ,yUe}from"/$bunfs/root/chunk-xnx53tr1.js";import{FCn,aet}from"/$bunfs/root/chunk-1n3yp4cx.js";import{loe}from"/$bunfs/root/chunk-ehvhmexj.js";import{fjn}from"/$bunfs/root/chunk-f4tqjvs0.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new j(()=>new s);function l(){return p.of(U().host)}async function vLe(t){if(!l().claimSettingsLoad())return;let e=O()?t?.backend:void 0;if(O()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-wtgxsc9h.js"),import("/$bunfs/root/chunk-4qcyqxz3.js"),import("/$bunfs/root/chunk-9xhk4gvj.js"),import("/$bunfs/root/chunk-wcw8b9bs.js")]);await r(e),await Promise.all([yTe(e),o(e,da())]),i(ee().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await yTe();if(await Bkt(),await aet(FCn),O()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-5v6t8ahx.js"),import("/$bunfs/root/chunk-eapapztq.js"),import("/$bunfs/root/chunk-nrd6kxer.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}aye(Ise),loe();let n=fjn();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function Klt(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await mUe(HQ(),wQ(),yUe()),qkt())loe();return e.error}async function nrn(t){return await vLe(t),Klt()}
export{vLe,Klt,nrn};
