// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{WD,ne}from"/$bunfs/root/chunk-btbsn9s4.js";import{ms}from"/$bunfs/root/chunk-hfjb09vk.js";import{vE,_e,Qt}from"/$bunfs/root/chunk-kcxa79n8.js";var H1e=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Eo(n,s){let o=ms(),r=o.includes("userSettings")&&vE();for(let t=o.length-1;t>=0;t--){let e=o[t];if(e==="projectSettings"&&r)continue;let i=_e(e)?.[n];if(i!==void 0)return{value:i,source:e}}if(H1e.includes(n)){let t=n,e=ne()[t];if(e!==void 0&&e!==WD[t])return{value:e,source:"legacyGlobalConfig"}}return{value:s,source:"default"}}function vP(n,s,o){Qt("userSettings",{[n]:s},void 0,o)}
export{H1e,Eo,vP};
