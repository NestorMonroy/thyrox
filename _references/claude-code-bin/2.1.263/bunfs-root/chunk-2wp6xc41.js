// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{hc}from"/$bunfs/root/chunk-ah1kb8zv.js";import{Ij,gd}from"/$bunfs/root/chunk-9wa0ka8p.js";function Out({recipientName:i,leaderMode:t,proactivityLevel:e,tasks:r}){let n=s(i,r)?t:Ij(t,e),o=hc(n);return o==="plan"?"default":o}function s(i,t){return Object.values(t).some((e)=>gd(e)&&e.status==="running"&&e.identity.agentName===i&&e.paneTeardown===void 0&&e.identity.resumableAgentId!==void 0)}
export{Out};
