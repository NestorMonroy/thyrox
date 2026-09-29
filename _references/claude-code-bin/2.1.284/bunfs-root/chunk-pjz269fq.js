// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{osr,reo}from"/$bunfs/root/chunk-tcmzsyy1.js";import{qY}from"/$bunfs/root/chunk-9mcpbfaa.js";function AJe({sessionId:s,getAccessToken:r,fetchSession:t,initial:e}){if(!qY())return;return reo({...e&&{initial:e.then(osr)},read:()=>t(s,{accessToken:r()}).then(osr)})}
export{AJe};
