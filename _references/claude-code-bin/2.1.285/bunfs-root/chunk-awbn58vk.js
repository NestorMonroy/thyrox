// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{lUt,Tde,Pft,yR,ce}from"/$bunfs/root/chunk-f74xvn8g.js";import{as}from"/$bunfs/root/chunk-xzfbbx57.js";import{rE,ge,fn}from"/$bunfs/root/chunk-g6a51st9.js";var iCe=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Mo(n,i){let o=as(),r=o.includes("userSettings")&&rE();for(let e=o.length-1;e>=0;e--){let t=o[e];if(t==="projectSettings"&&r)continue;let s=ge(t)?.[n];if(s!==void 0)return{value:s,source:t}}if(iCe.includes(n)){let e=n,t=ce()[e];if(t!==void 0&&t!==yR[e]){let s=lUt(e)?Pft(e,t):Tde(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function S1(n,i,o){fn("userSettings",{[n]:i},void 0,o)}
export{iCe,Mo,S1};
