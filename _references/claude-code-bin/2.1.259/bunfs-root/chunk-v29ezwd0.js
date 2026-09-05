// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{M}from"/$bunfs/root/chunk-56nvyfje.js";import{ie,ZTe}from"/$bunfs/root/chunk-x722nt0q.js";import{Ia}from"/$bunfs/root/chunk-mzmfq60a.js";import{ECe,hUe,Rkt,qQ,KQ,bUe}from"/$bunfs/root/chunk-67nd7etf.js";import{HIn,cet}from"/$bunfs/root/chunk-b5ax9mbm.js";import{wie}from"/$bunfs/root/chunk-6dcxrmbt.js";import{F2n}from"/$bunfs/root/chunk-x05cyafz.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var s_r=new V(()=>new s);function l(){return s_r.of(z().host)}async function _Pe(t){if(!l().claimSettingsLoad())return;let e=M()?t?.backend:void 0;if(M()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:n},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-an7hjdnp.js"),import("/$bunfs/root/chunk-ec51pa7k.js"),import("/$bunfs/root/chunk-3gbh9qd0.js"),import("/$bunfs/root/chunk-0avp9trf.js")]);await r(e),await Promise.all([ZTe(e),o(e,Ia())]),i(ie().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await n(e)}else await ZTe();if(await ECe(),await cet(HIn),M()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:n}]=await Promise.all([import("/$bunfs/root/chunk-c8eqqg1y.js"),import("/$bunfs/root/chunk-qndvhc6q.js"),import("/$bunfs/root/chunk-kfnesvp7.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await n(r)}wie();let a=F2n();if(a)process.stderr.write(`${a}
`),process.exit(1)}async function Xlt(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await hUe(qQ(),KQ(),bUe()),Rkt())wie();return e.error}async function pon(t){return await _Pe(t),Xlt()}
export{s_r,_Pe,Xlt,pon};
