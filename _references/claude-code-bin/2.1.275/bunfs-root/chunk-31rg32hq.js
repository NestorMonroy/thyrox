// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,W,LIe}from"/$bunfs/root/chunk-4qqe0nh4.js";import{F}from"/$bunfs/root/chunk-h401nbms.js";import{rye,ie,KUe}from"/$bunfs/root/chunk-xbd48fav.js";import{Va}from"/$bunfs/root/chunk-q8sknw7e.js";import{$3t,Qwt,Zwt,z9,Y3,HBe}from"/$bunfs/root/chunk-v49f6nqy.js";import{ysr,Wwt}from"/$bunfs/root/chunk-jk1ewzz0.js";import{JY}from"/$bunfs/root/chunk-e7wwzed3.js";import{Yqr}from"/$bunfs/root/chunk-vwrjzzkc.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new G(()=>new s);function l(){return p.of(W().host)}async function f9e(t){if(!l().claimSettingsLoad())return;let e=F()?t?.backend:void 0;if(F()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-380qcttt.js"),import("/$bunfs/root/chunk-nd44brje.js"),import("/$bunfs/root/chunk-wf5k9e6f.js"),import("/$bunfs/root/chunk-wb6fmwe2.js")]);await r(e),await Promise.all([KUe(e),o(e,Va())]),i(ie().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await KUe();if(await $3t(),await Wwt(ysr),F()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-347j44ag.js"),import("/$bunfs/root/chunk-40efycwa.js"),import("/$bunfs/root/chunk-6cbx28az.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}LIe(rye),JY();let n=Yqr();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function Dqt(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await Qwt(z9(),Y3(),HBe()),Zwt())JY();return e.error}async function SQn(t){return await f9e(t),Dqt()}
export{f9e,Dqt,SQn};
