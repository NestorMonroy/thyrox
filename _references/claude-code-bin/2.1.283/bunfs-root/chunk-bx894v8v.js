// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{jtr,dJr}from"/$bunfs/root/chunk-z03vy65b.js";import{pY}from"/$bunfs/root/chunk-xfxmyk80.js";function K9e({sessionId:s,getAccessToken:r,fetchSession:t,initial:e}){if(!pY())return;return dJr({...e&&{initial:e.then(jtr)},read:()=>t(s,{accessToken:r()}).then(jtr)})}
export{K9e};
