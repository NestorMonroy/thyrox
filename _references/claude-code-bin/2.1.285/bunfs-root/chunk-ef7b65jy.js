// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{iu}from"/$bunfs/root/chunk-pwq1zdc1.js";import{jS,Ef}from"/$bunfs/root/chunk-e0gw2zfa.js";function oB(t,r){return`${iu(t)??""}/${iu(r)??""}`}function jyr(t){return iu(t)??""}function bCt({serverName:t,toolName:r,mcpTaskId:o,toolUseId:s,pollIntervalMs:n,abortController:a,protocol:i,driveAbortController:p,ttlExpiresAt:c}){let e=jS("mcp_task");return{...Ef(e,"mcp_task",oB(t,r),s),type:"mcp_task",status:"running",serverName:t,toolName:r,mcpTaskId:o??e,mcpStatus:"working",pollIntervalMs:n,abortController:a,protocol:i,driveAbortController:p,ttlExpiresAt:c}}
export{oB,jyr,bCt};
