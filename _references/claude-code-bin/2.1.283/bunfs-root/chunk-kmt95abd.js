// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,j,RBe}from"/$bunfs/root/chunk-nvht7ckf.js";import{N}from"/$bunfs/root/chunk-8nz62976.js";import{dCe,le,H6e}from"/$bunfs/root/chunk-t6pwageh.js";import{dl}from"/$bunfs/root/chunk-sctj0cwn.js";import{IYe,Cpt,MYe,a6,Wq,pRe}from"/$bunfs/root/chunk-ckctvm5v.js";import{FBr,tUt}from"/$bunfs/root/chunk-krqtcw03.js";import{AX}from"/$bunfs/root/chunk-fyjk3yda.js";import{_Io}from"/$bunfs/root/chunk-ztdq8y88.js";import{Jzn}from"/$bunfs/root/chunk-5whjfs34.js";class s{settingsLoaded=!1;helperResult=null;claimSettingsLoad(){if(this.settingsLoaded)return!1;return this.settingsLoaded=!0,!0}beginHelperRun(){return this.helperResult={error:null},this.helperResult}}var p=new q(()=>new s);function l(){return p.of(j().host)}async function Oct(t){if(!l().claimSettingsLoad())return;Jzn();let e=N()?t?.backend:void 0;if(N()&&e!==void 0){let[{seedUserSettings:o},{primeWindowsCredManBackendEnabled:i},{primeRemoteManagedSettingsCache:a},{primeWorkspaceRoots:r}]=await Promise.all([import("/$bunfs/root/chunk-t69xmbtg.js"),import("/$bunfs/root/chunk-c6tz2b8d.js"),import("/$bunfs/root/chunk-mf5jdxqf.js"),import("/$bunfs/root/chunk-m7vnhkxg.js")]);await r(e),await Promise.all([H6e(e),o(e,dl())]),i(le().cachedGrowthBookFeatures?.tengu_windows_credman===!0),await a(e)}else await H6e();if(await IYe(),await tUt(FBr),N()&&e!==void 0){let[{credentialsStoreFor:o},{primeFileDescriptorCredentials:i},{primeStoredLoginCopy:a}]=await Promise.all([import("/$bunfs/root/chunk-1zxdqxp5.js"),import("/$bunfs/root/chunk-5925nfdw.js"),import("/$bunfs/root/chunk-cxv9peb1.js")]),r=o(e);if(r!==void 0)await i(r,{bgAuthSnapshot:"leave"}),await a(r)}RBe(dCe),AX();let n=_Io();if(n)process.stderr.write(`${n}
`),process.exit(1)}async function mcn(){let t=l();if(t.helperResult)return t.helperResult.error;let e=t.beginHelperRun();if(e.error=await Cpt(a6(),Wq(),pRe()),MYe())AX();return e.error}async function gMr(t){return await Oct(t),mcn()}
export{Oct,mcn,gMr};
