// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{rh}from"/$bunfs/root/chunk-d37h8mav.js";import{Zl}from"/$bunfs/root/chunk-0j2vcydt.js";function Hle(){return!1}function sln(){if(rh())return!1;return!0}var a=120000,l=600000;function mAe(e=process.env){let o=e.BASH_DEFAULT_TIMEOUT_MS;if(o){let t=Zl(o);if(!isNaN(t)&&t>0)return t}return a}function gAe(e=process.env){let o=e.BASH_MAX_TIMEOUT_MS;if(o){let t=Zl(o);if(!isNaN(t)&&t>0)return Math.max(t,mAe(e))}return Math.max(l,mAe(e))}var u=2000;function iln({requestedTimeoutMs:e,isMainAgent:o,canAutoBackground:t,env:s=process.env}){if(!o||!t)return e;let r=s.CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS;if(!r)return e;let n=Zl(r);if(isNaN(n)||n<=0)return e;return Math.min(e,Math.max(n,u))}var vx="WaitForMcpServers";function rHr(){return["Wait for MCP servers that are still connecting and whose tools are not","yet in your tool list. Pass `servers` to wait for specific ones, or omit","it to wait for all pending servers (once none is pending, a call without","`servers` reports any server that failed to connect or is not configured).","",...["If the user's request needs tools from a still-connecting server, call this","tool to wait for it. Once it connects, its tools will be added to your tool","list and you can use them directly. Returns ready=true when servers are","ready, ready=false if they failed to connect, need authentication, or are","disabled."],"","You do not need to ask the user for confirmation to use this tool."].join(`
`)}
export{Hle,sln,mAe,gAe,iln,vx,rHr};
