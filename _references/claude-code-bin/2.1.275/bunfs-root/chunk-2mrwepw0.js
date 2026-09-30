// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{GTe}from"/$bunfs/root/chunk-87qahtf8.js";import{Hbn,KQn,Obn,Mbn}from"/$bunfs/root/chunk-7c0402zk.js";import{Tjr}from"/$bunfs/root/chunk-18449jay.js";function ZHe(e){let t=!1;return t=e.includes("hearth-rc-child"),{rcChild:e.includes(Tjr),projectThreadChild:t}}function CIt(e){if(Hbn())return!0;return Obn()||e==="spawn"&&Mbn()}function RIt(e){let t=e.roles.rcChild&&!e.modePinned&&Hbn(),l=t&&KQn()&&GTe(e.settings()),o=!1,i=!1;return o=e.roles.projectThreadChild&&Obn(),i=e.roles.projectThreadChild&&Mbn(),{autoDefault:t,autoOverSettings:l,artifact:o,machineSettings:i}}
export{ZHe,CIt,RIt};
