// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ND,ee}from"/$bunfs/root/chunk-hyqdn9c0.js";import{ms}from"/$bunfs/root/chunk-tcap6yb8.js";import{Ww,_e,Jt}from"/$bunfs/root/chunk-2e0agwm9.js";var fBe=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Eo(n,s){let o=ms(),r=o.includes("userSettings")&&Ww();for(let t=o.length-1;t>=0;t--){let e=o[t];if(e==="projectSettings"&&r)continue;let i=_e(e)?.[n];if(i!==void 0)return{value:i,source:e}}if(fBe.includes(n)){let t=n,e=ee()[t];if(e!==void 0&&e!==ND[t])return{value:e,source:"legacyGlobalConfig"}}return{value:s,source:"default"}}function OI(n,s,o){Jt("userSettings",{[n]:s},void 0,o)}
export{fBe,Eo,OI};
