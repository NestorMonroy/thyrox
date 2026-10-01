// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{y1t,nue,Tgt,PR,ce}from"/$bunfs/root/chunk-4hjp8tw4.js";import{Go}from"/$bunfs/root/chunk-3fx39wvj.js";import{CS,ge,mn}from"/$bunfs/root/chunk-j27hwf9z.js";var QCe=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Fo(n,i){let o=Go(),r=o.includes("userSettings")&&CS();for(let e=o.length-1;e>=0;e--){let t=o[e];if(t==="projectSettings"&&r)continue;let s=ge(t)?.[n];if(s!==void 0)return{value:s,source:t}}if(QCe.includes(n)){let e=n,t=ce()[e];if(t!==void 0&&t!==PR[e]){let s=y1t(e)?Tgt(e,t):nue(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function Q1(n,i,o){mn("userSettings",{[n]:i},void 0,o)}
export{QCe,Fo,Q1};
