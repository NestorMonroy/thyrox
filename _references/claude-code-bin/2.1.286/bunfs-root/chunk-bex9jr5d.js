// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{V,j,cWe}from"/$bunfs/root/chunk-hbjpbz2q.js";import{F}from"/$bunfs/root/chunk-616rkgbc.js";import{HRe,ce,N9e}from"/$bunfs/root/chunk-4hjp8tw4.js";import{pa}from"/$bunfs/root/chunk-3fx39wvj.js";import{WXe,bht,KXe,SY,t4,Zxe}from"/$bunfs/root/chunk-j27hwf9z.js";import{l5r,Szt}from"/$bunfs/root/chunk-qbrmgrn3.js";import{DJ}from"/$bunfs/root/chunk-tz49jnpn.js";import{x$o}from"/$bunfs/root/chunk-fj5dd83t.js";import{e3n}from"/$bunfs/root/chunk-2ck58wmz.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new V(()=>new s);function l(){return p.of(j().host)}async function oft(t){if(!l().claimSettingsLoad())return;e3n();let e=F()?t?.backend:void 0;if(F()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-pdwxww9v.js"),import("/$bunfs/root/chunk-qanqrxha.js"),import("/$bunfs/root/chunk-e51f9ks4.js"),import("/$bunfs/root/chunk-ew760z6z.js")]);await r(e),await Promise.all([N9e(e),o(e,pa())]),i(ce().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await N9e();if(await WXe(),await Szt(l5r),F()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-sepdmx90.js"),import("/$bunfs/root/chunk-ap8hxy3z.js"),import("/$bunfs/root/chunk-qhvdmy5f.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}cWe(HRe),DJ();let n=x$o();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function Xfn(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await bht(SY(),t4(),Zxe()),KXe())DJ();return e.error}async function DUr(t){return await oft(t),Xfn()}
export{oft,Xfn,DUr};
