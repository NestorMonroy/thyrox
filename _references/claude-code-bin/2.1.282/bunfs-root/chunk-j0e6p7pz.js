// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,W,wFe}from"/$bunfs/root/chunk-zwm3fybx.js";import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{rTe,le,l5e}from"/$bunfs/root/chunk-wbbthbh9.js";import{tl}from"/$bunfs/root/chunk-e8ycfccz.js";import{hcn,Dct,d3e,I5,_V,iAe}from"/$bunfs/root/chunk-verj0kzw.js";import{SMr,kLt}from"/$bunfs/root/chunk-3vkd08w1.js";import{K8}from"/$bunfs/root/chunk-27czggbv.js";import{nwo}from"/$bunfs/root/chunk-m0arx78f.js";import{OBn}from"/$bunfs/root/chunk-xx2x24af.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new K(()=>new s);function l(){return p.of(W().host)}async function Nit(t){if(!l().claimSettingsLoad())return;OBn();let e=N()?t?.backend:void 0;if(N()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-myatk7se.js"),import("/$bunfs/root/chunk-mnhfxss0.js"),import("/$bunfs/root/chunk-3eqc9y1c.js"),import("/$bunfs/root/chunk-h11kkf09.js")]);await r(e),await Promise.all([l5e(e),o(e,tl())]),i(le().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await l5e();if(await hcn(),await kLt(SMr),N()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-42t4xy96.js"),import("/$bunfs/root/chunk-x5xmycje.js"),import("/$bunfs/root/chunk-rgcezht8.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}wFe(rTe),K8();let n=nwo();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function Won(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await Dct(I5(),_V(),iAe()),d3e())K8();return e.error}async function sCr(t){return await Nit(t),Won()}
export{Nit,Won,sCr};
