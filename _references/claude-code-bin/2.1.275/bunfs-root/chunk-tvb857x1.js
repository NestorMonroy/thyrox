// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{tU,ie}from"/$bunfs/root/chunk-xbd48fav.js";import{Bo}from"/$bunfs/root/chunk-q8sknw7e.js";import{LT,ge,tn}from"/$bunfs/root/chunk-v49f6nqy.js";var y9e=["theme","editorMode","verbose","preferredNotifChannel","autoCompactEnabled","autoScrollEnabled","fileCheckpointingEnabled","showTurnDuration","showMessageTimestamps","terminalProgressBarEnabled","todoFeatureEnabled","teammateMode","remoteControlAtStartup","autoUploadSessions","inputNeededNotifEnabled","agentPushNotifEnabled"];function Io(n,s){let o=Bo(),r=o.includes("userSettings")&&LT();for(let t=o.length-1;t>=0;t--){let e=o[t];if(e==="projectSettings"&&r)continue;let i=ge(e)?.[n];if(i!==void 0)return{value:i,source:e}}if(y9e.includes(n)){let t=n,e=ie()[t];if(e!==void 0&&e!==tU[t])return{value:e,source:"legacyGlobalConfig"}}return{value:s,source:"default"}}function rN(n,s,o){tn("userSettings",{[n]:s},void 0,o)}
export{y9e,Io,rN};
