// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{p1,ie}from"/$bunfs/root/chunk-27bj2wbx.js";import{Uo}from"/$bunfs/root/chunk-q77993h4.js";import{cT,me,Zt}from"/$bunfs/root/chunk-m0am9fba.js";var E8e=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Io(n,s){let o=Uo(),r=o.includes("userSettings")&&cT();for(let t=o.length-1;t>=0;t--){let e=o[t];if(e==="projectSettings"&&r)continue;let i=me(e)?.[n];if(i!==void 0)return{value:i,source:e}}if(E8e.includes(n)){let t=n,e=ie()[t];if(e!==void 0&&e!==p1[t])return{value:e,source:"legacyGlobalConfig"}}return{value:s,source:"default"}}function $L(n,s,o){Zt("userSettings",{[n]:s},void 0,o)}
export{E8e,Io,$L};
