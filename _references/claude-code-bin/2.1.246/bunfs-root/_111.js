// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{fBb as u,hBb as f}from"/$bunfs/root/_559.js";import{jhd as i,ohd as l}from"/$bunfs/root/_820.js";import{rud as s,wud as p}from"/$bunfs/root/_830.js";import{Dvd as t,dwd as a}from"/$bunfs/root/_832.js";p();l();f();a();var d={MCP:"run /mcp for details",plugins:"run /plugin for details",sandbox:"run /sandbox for details",settings:"run `claude doctor` for details",install:"run `claude doctor` for details"};function S(e,r){if(r<=0)return;let o=d[e];i(`${r} setup ${t(r,"issue")}: ${e}${o?` (${o})`:""}`,{level:"info"})}function g(e,r,o){if(u(e))return!1;if(e.config.type==="claudeai-proxy"){if(e.config.eligible===!1&&!o(e.name))return!1;return r(e.name)}return e.config.type!=="sse-ide"&&e.config.type!=="ws-ide"}function C(e,r,o){return s(e,(n)=>n.type==="needs-auth"&&g(n,r,o))}
export{S as vl,g as wl,C as xl};
