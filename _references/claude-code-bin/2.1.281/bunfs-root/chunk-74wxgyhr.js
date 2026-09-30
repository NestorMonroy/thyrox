// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{cu}from"/$bunfs/root/chunk-x1ncsv92.js";import{Lb,rm}from"/$bunfs/root/chunk-ag7kxh8x.js";function Gye(t,r){return`${cu(t)??""}/${cu(r)??""}`}function u4r({serverName:t,toolName:r,mcpTaskId:s,toolUseId:o,pollIntervalMs:n,abortController:a,protocol:i,driveAbortController:p,ttlExpiresAt:l}){let e=Lb("mcp_task");return{...rm(e,"mcp_task",Gye(t,r),o),type:"mcp_task",status:"running",serverName:t,toolName:r,mcpTaskId:s??e,mcpStatus:"working",pollIntervalMs:n,abortController:a,protocol:i,driveAbortController:p,ttlExpiresAt:l}}
export{Gye,u4r};
