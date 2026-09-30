// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{n$t,Ice,Fut,UC,le}from"/$bunfs/root/chunk-t6pwageh.js";import{fs}from"/$bunfs/root/chunk-sctj0cwn.js";import{fA,he,cn}from"/$bunfs/root/chunk-ckctvm5v.js";var bAe=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Mo(n,i){let o=fs(),r=o.includes("userSettings")&&fA();for(let e=o.length-1;e>=0;e--){let t=o[e];if(t==="projectSettings"&&r)continue;let s=he(t)?.[n];if(s!==void 0)return{value:s,source:t}}if(bAe.includes(n)){let e=n,t=le()[e];if(t!==void 0&&t!==UC[e]){let s=n$t(e)?Fut(e,t):Ice(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function n1(n,i,o){cn("userSettings",{[n]:i},void 0,o)}
export{bAe,Mo,n1};
