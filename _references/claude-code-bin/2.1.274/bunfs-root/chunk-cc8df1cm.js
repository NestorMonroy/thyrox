// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{xAe}from"/$bunfs/root/chunk-fqhxwpnv.js";import{zgn,KYn,Wgn,Ggn}from"/$bunfs/root/chunk-vg82hr0a.js";import{RNr}from"/$bunfs/root/chunk-yrexxcj4.js";function wPe(e){let t=!1;return t=e.includes("hearth-rc-child"),{rcChild:e.includes(RNr),projectThreadChild:t}}function XCt(e){if(zgn())return!0;return Wgn()||e==="spawn"&&Ggn()}function JCt(e){let t=e.roles.rcChild&&!e.modePinned&&zgn(),l=t&&KYn()&&xAe(e.settings()),o=!1,i=!1;return o=e.roles.projectThreadChild&&Wgn(),i=e.roles.projectThreadChild&&Ggn(),{autoDefault:t,autoOverSettings:l,artifact:o,machineSettings:i}}
export{wPe,XCt,JCt};
