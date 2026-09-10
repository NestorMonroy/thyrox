// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{X0,ie}from"/$bunfs/root/chunk-x722nt0q.js";import{xi}from"/$bunfs/root/chunk-mzmfq60a.js";import{pE,Se,nn}from"/$bunfs/root/chunk-67nd7etf.js";var Yke=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function xo(n,s){let o=xi(),r=o.includes("userSettings")&&pE();for(let t=o.length-1;t>=0;t--){let e=o[t];if(e==="projectSettings"&&r)continue;let i=Se(e)?.[n];if(i!==void 0)return{value:i,source:e}}if(Yke.includes(n)){let t=n,e=ie()[t];if(e!==void 0&&e!==X0[t])return{value:e,source:"legacyGlobalConfig"}}return{value:s,source:"default"}}function ux(n,s,o){nn("userSettings",{[n]:s},void 0,o)}
export{Yke,xo,ux};
