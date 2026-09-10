// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{L}from"/$bunfs/root/chunk-x722nt0q.js";import{_r}from"/$bunfs/root/chunk-qpwbvc04.js";import{$a}from"/$bunfs/root/chunk-7bh7nxpg.js";var p=["microsoft365.mcp.claude.com","gmail.mcp.claude.com","gcal.mcp.claude.com"];function i(e){return e.toLowerCase().replace(/\.$/,"")}function u(){let e=L("tengu_mcp_local_oauth_blocked_hosts",{hosts:p}),t=p;if(e!==null&&typeof e==="object"&&"hosts"in e&&Array.isArray(e.hosts)){let o=e.hosts.filter((n)=>typeof n==="string");if(o.length>0)t=o}return new Set(t.map(i))}function c(e){if(!e)return!1;try{let t=i(new URL(e).hostname);return u().has(t)}catch{return!1}}function a(e,t={}){let o=`"${_r(e)}" is Anthropic-hosted and doesn't support local OAuth. `+"Connect it via Settings \u2192 Connectors on claude.ai (requires "+"`claude login`), then it'll be available here automatically.",r=t.scope==="local"||t.scope==="project"||t.scope==="user"?$a("mcp remove",e):null,s=r?`${o} Remove the stale entry with: \`${r}\``:o;return r&&[...s].length<=1024?s:o}function HL(e,t){if(t.type==="claudeai-proxy")return{kind:"claudeai-proxy",config:t};if(t.type!=="sse"&&t.type!=="http")return{kind:"unsupported-transport",transport:t.type??"stdio"};if(c(t.url))return{kind:"anthropic-hosted",config:t,message:a(e,{scope:t.scope})};return{kind:"oauth",config:t}}
export{HL};
