// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{q,j,V1e}from"/$bunfs/root/chunk-d37h8mav.js";import{N}from"/$bunfs/root/chunk-0pd7kjzx.js";import{SRe,ce,g8e}from"/$bunfs/root/chunk-swk3rjnt.js";import{bl}from"/$bunfs/root/chunk-m399t3d8.js";import{d9e,xmt,m9e,F6,EK,vxe}from"/$bunfs/root/chunk-r03mjfax.js";import{KGr,C1t}from"/$bunfs/root/chunk-vfge45b6.js";import{aJ}from"/$bunfs/root/chunk-ehxebdc7.js";import{_0o}from"/$bunfs/root/chunk-363gvrjc.js";import{PKn}from"/$bunfs/root/chunk-53qypbfe.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new q(()=>new s);function l(){return p.of(j().host)}async function Out(t){if(!l().claimSettingsLoad())return;PKn();let e=N()?t?.backend:void 0;if(N()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-hz9xtyq4.js"),import("/$bunfs/root/chunk-4fdpx68a.js"),import("/$bunfs/root/chunk-savabmha.js"),import("/$bunfs/root/chunk-xct75xhg.js")]);await r(e),await Promise.all([g8e(e),o(e,bl())]),i(ce().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await g8e();if(await d9e(),await C1t(KGr),N()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-3kcabrwg.js"),import("/$bunfs/root/chunk-nxpq39z2.js"),import("/$bunfs/root/chunk-081gnw6t.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}V1e(SRe),aJ();let n=_0o();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function ipn(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await xmt(F6(),EK(),vxe()),m9e())aJ();return e.error}async function wNr(t){return await Out(t),ipn()}
export{Out,ipn,wNr};
