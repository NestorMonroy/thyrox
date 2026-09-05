// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{M}from"/$bunfs/root/chunk-y7x1gsy0.js";import{ie,$ke}from"/$bunfs/root/chunk-8qt7d28b.js";import{ka}from"/$bunfs/root/chunk-64kpb0yv.js";import{aTe,OBe,UAt,uQ,dQ,UBe}from"/$bunfs/root/chunk-0300m3ak.js";import{wkn,DQe}from"/$bunfs/root/chunk-mt21y33a.js";import{Coe}from"/$bunfs/root/chunk-8sgbh95c.js";import{P1n}from"/$bunfs/root/chunk-fzn3re55.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var Imr=new Y(()=>new s);function l(){return Imr.of(W().host)}async function gLe(t){if(!l().claimSettingsLoad())return;let e=M()?t?.backend:void 0;if(M()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:n},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-j71wnavx.js"),import("/$bunfs/root/chunk-6fx7vam5.js"),import("/$bunfs/root/chunk-n54j6pv1.js"),import("/$bunfs/root/chunk-5zqwdpjv.js")]);await r(e),await Promise.all([$ke(e),o(e,ka())]),i(ie().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await n(e)}else await $ke();if(await aTe(),await DQe(wkn),M()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:n}]=await Promise.all([import("/$bunfs/root/chunk-7mk2g1xy.js"),import("/$bunfs/root/chunk-3yxy0qn6.js"),import("/$bunfs/root/chunk-40t3514x.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await n(r)}Coe();let a=P1n();if(a)process.stderr.write(`${a}
`),process.exit(1)}async function mlt(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await OBe(uQ(),dQ(),UBe()),UAt())Coe();return e.error}async function cnn(t){return await gLe(t),mlt()}
export{Imr,gLe,mlt,cnn};
