// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{kHb as s,pHb as n,yHb as i}from"/$bunfs/root/_573.js";import{xxd as l}from"/$bunfs/root/_837.js";function f(r){let e=r.toLowerCase();if(!a.includes(e))return null;return e}function m(r,e){let t=s(e);return r.filter((o)=>{if(n(e,o,t))return!1;if(o.underlyingV1ToolName&&n(e,{name:o.underlyingV1ToolName},t))return!1;return o.mcpInfo?.effectiveMaxPermission!=="blocked"})}var a;var u=l(()=>{i();a=["default"]});
export{f as sGb,m as tGb,u as uGb};
