// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,G,dxe}from"/$bunfs/root/chunk-ja309z9r.js";import{F}from"/$bunfs/root/chunk-p7hrkaq4.js";import{Pge,ie,qFe}from"/$bunfs/root/chunk-27bj2wbx.js";import{Ga}from"/$bunfs/root/chunk-q77993h4.js";import{_Vt,Mbt,AVt,Aae,l3,q1e}from"/$bunfs/root/chunk-m0am9fba.js";import{kZn,Z_t}from"/$bunfs/root/chunk-3x88vsy7.js";import{dY}from"/$bunfs/root/chunk-gdw8zh2e.js";import{JBr}from"/$bunfs/root/chunk-b617pbjf.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new W(()=>new s);function l(){return p.of(G().host)}async function _8e(t){if(!l().claimSettingsLoad())return;let e=F()?t?.backend:void 0;if(F()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-8e6rzqy7.js"),import("/$bunfs/root/chunk-eb8rhywd.js"),import("/$bunfs/root/chunk-d123b40b.js"),import("/$bunfs/root/chunk-s611c10b.js")]);await r(e),await Promise.all([qFe(e),o(e,Ga())]),i(ie().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await qFe();if(await _Vt(),await Z_t(kZn),F()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-bcwys18z.js"),import("/$bunfs/root/chunk-x4h70bvv.js"),import("/$bunfs/root/chunk-gs4psjkr.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}dxe(Pge),dY();let n=JBr();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function wzt(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await Mbt(Aae(),l3(),q1e()),AVt())dY();return e.error}async function wYn(t){return await _8e(t),wzt()}
export{_8e,wzt,wYn};
