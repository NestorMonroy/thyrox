// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ilr,Koo}from"/$bunfs/root/chunk-4jnmpg1m.js";import{C8}from"/$bunfs/root/chunk-dzvv5q1x.js";function rQe({sessionId:s,getAccessToken:r,fetchSession:t,initial:e}){if(!C8())return;return Koo({...e&&{initial:e.then(ilr)},read:()=>t(s,{accessToken:r()}).then(ilr)})}
export{rQe};
