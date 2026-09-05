// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{j,U,iye}from"/$bunfs/root/chunk-annedm50.js";import{O}from"/$bunfs/root/chunk-x7f60hk6.js";import{Cse,ee,yTe}from"/$bunfs/root/chunk-hyqdn9c0.js";import{da}from"/$bunfs/root/chunk-tcap6yb8.js";import{Fkt,pUe,Vkt,bQ,SQ,hUe}from"/$bunfs/root/chunk-2e0agwm9.js";import{OCn,aet}from"/$bunfs/root/chunk-ptxv38cr.js";import{ioe}from"/$bunfs/root/chunk-229jbyns.js";import{cjn}from"/$bunfs/root/chunk-xsw3bzxm.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new j(()=>new s);function l(){return p.of(U().host)}async function vLe(t){if(!l().claimSettingsLoad())return;let e=O()?t?.backend:void 0;if(O()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-kja6b82g.js"),import("/$bunfs/root/chunk-tyvhberg.js"),import("/$bunfs/root/chunk-g3a4m85c.js"),import("/$bunfs/root/chunk-6p2kvw5r.js")]);await r(e),await Promise.all([yTe(e),o(e,da())]),i(ee().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await yTe();if(await Fkt(),await aet(OCn),O()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-g8tkjkaj.js"),import("/$bunfs/root/chunk-b5aywsw0.js"),import("/$bunfs/root/chunk-s7f7wweh.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}iye(Cse),ioe();let n=cjn();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function qlt(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await pUe(bQ(),SQ(),hUe()),Vkt())ioe();return e.error}async function trn(t){return await vLe(t),qlt()}
export{vLe,qlt,trn};
