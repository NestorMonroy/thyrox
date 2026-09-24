// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{iOt,Lie,oat,XA,le}from"/$bunfs/root/chunk-5khn4tvf.js";import{DI,ye,sn}from"/$bunfs/root/chunk-pw35yar9.js";import{us}from"/$bunfs/root/chunk-3hxvvnfw.js";var Gve=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function yo(n,i){let o=us(),r=o.includes("userSettings")&&DI();for(let e=o.length-1;e>=0;e--){let t=o[e];if(t==="projectSettings"&&r)continue;let s=ye(t)?.[n];if(s!==void 0)return{value:s,source:t}}if(Gve.includes(n)){let e=n,t=le()[e];if(t!==void 0&&t!==XA[e]){let s=iOt(e)?oat(e,t):Lie(e,t);if(s!==void 0)return{value:s,source:"legacyGlobalConfig"}}}return{value:i,source:"default"}}function cU(n,i,o){sn("userSettings",{[n]:i},void 0,o)}
export{Gve,yo,cU};
