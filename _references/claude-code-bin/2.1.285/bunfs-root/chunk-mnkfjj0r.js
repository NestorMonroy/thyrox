// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,j,X1e}from"/$bunfs/root/chunk-bxhyh54r.js";import{L}from"/$bunfs/root/chunk-k3gp1qmc.js";import{jCe,ce,f8e}from"/$bunfs/root/chunk-f74xvn8g.js";import{da}from"/$bunfs/root/chunk-xzfbbx57.js";import{h9e,bmt,w9e,K6,CK,oxe}from"/$bunfs/root/chunk-g6a51st9.js";import{kVr,ujt}from"/$bunfs/root/chunk-wyssq993.js";import{iJ}from"/$bunfs/root/chunk-nwh1m55b.js";import{YMo}from"/$bunfs/root/chunk-wmg38xgw.js";import{Xqn}from"/$bunfs/root/chunk-xhgyx6nr.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new q(()=>new s);function l(){return p.of(j().host)}async function put(t){if(!l().claimSettingsLoad())return;Xqn();let e=L()?t?.backend:void 0;if(L()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-ctk20fns.js"),import("/$bunfs/root/chunk-s3kjkzp8.js"),import("/$bunfs/root/chunk-bvfrt00a.js"),import("/$bunfs/root/chunk-y757tykj.js")]);await r(e),await Promise.all([f8e(e),o(e,da())]),i(ce().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await f8e();if(await h9e(),await ujt(kVr),L()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-bx6f2h61.js"),import("/$bunfs/root/chunk-4hsr7pzd.js"),import("/$bunfs/root/chunk-fjvrg28c.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}X1e(jCe),iJ();let n=YMo();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function hun(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await bmt(K6(),CK(),oxe()),w9e())iJ();return e.error}async function fNr(t){return await put(t),hun()}
export{put,hun,fNr};
