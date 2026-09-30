// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{IMt,Oae,zlt,mC,le}from"/$bunfs/root/chunk-wbbthbh9.js";import{ts}from"/$bunfs/root/chunk-e8ycfccz.js";import{VT,ye,an}from"/$bunfs/root/chunk-verj0kzw.js";var uke=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Ao(n,i){let o=ts(),r=o.includes("userSettings")&&VT();for(let e=o.length-1;e>=0;e--){let t=o[e];if(t==="projectSettings"&&r)continue;let s=ye(t)?.[n];if(s!==void 0)return{value:s,source:t}}if(uke.includes(n)){let e=n,t=le()[e];if(t!==void 0&&t!==mC[e]){let s=IMt(e)?zlt(e,t):Oae(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function NU(n,i,o){an("userSettings",{[n]:i},void 0,o)}
export{uke,Ao,NU};
