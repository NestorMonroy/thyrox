// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{O0,ie}from"/$bunfs/root/chunk-8qt7d28b.js";import{vi}from"/$bunfs/root/chunk-64kpb0yv.js";import{eE,be,Qt}from"/$bunfs/root/chunk-0300m3ak.js";var Pve=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function ko(n,s){let o=vi(),r=o.includes("userSettings")&&eE();for(let t=o.length-1;t>=0;t--){let e=o[t];if(e==="projectSettings"&&r)continue;let i=be(e)?.[n];if(i!==void 0)return{value:i,source:e}}if(Pve.includes(n)){let t=n,e=ie()[t];if(e!==void 0&&e!==O0[t])return{value:e,source:"legacyGlobalConfig"}}return{value:s,source:"default"}}function YR(n,s,o){Qt("userSettings",{[n]:s},void 0,o)}
export{Pve,ko,YR};
