// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{xUt,Rde,jft,lR,ce}from"/$bunfs/root/chunk-swk3rjnt.js";import{fs}from"/$bunfs/root/chunk-m399t3d8.js";import{Qv,he,hn}from"/$bunfs/root/chunk-r03mjfax.js";var ICe=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Fo(n,i){let o=fs(),r=o.includes("userSettings")&&Qv();for(let e=o.length-1;e>=0;e--){let t=o[e];if(t==="projectSettings"&&r)continue;let s=he(t)?.[n];if(s!==void 0)return{value:s,source:t}}if(ICe.includes(n)){let e=n,t=ce()[e];if(t!==void 0&&t!==lR[e]){let s=xUt(e)?jft(e,t):Rde(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function v1(n,i,o){hn("userSettings",{[n]:i},void 0,o)}
export{ICe,Fo,v1};
