// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{msr,hto}from"/$bunfs/root/chunk-6srfw2e5.js";import{n8}from"/$bunfs/root/chunk-m5w62wem.js";function TJe({sessionId:s,getAccessToken:r,fetchSession:t,initial:e}){if(!n8())return;return hto({...e&&{initial:e.then(msr)},read:()=>t(s,{accessToken:r()}).then(msr)})}
export{TJe};
