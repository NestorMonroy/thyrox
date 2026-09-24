// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{_g,m$}from"/$bunfs/root/chunk-cqc88nqm.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{Ke}from"/$bunfs/root/chunk-pw35yar9.js";import{jo}from"/$bunfs/root/chunk-7qxbq1fh.js";import{Gt}from"/$bunfs/root/chunk-n9ykdegv.js";import{go}from"/$bunfs/root/chunk-5khn4tvf.js";import{ap}from"/$bunfs/root/chunk-fsqmbqq9.js";import{iI}from"/$bunfs/root/chunk-nnbt746m.js";import{rb}from"/$bunfs/root/chunk-1f9whjbs.js";function oye(o){let l=jo();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!ap())return!1;if(rb()||_g())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Ke().skillOverrides?.[iI];if(o==="off"||o==="user-invocable-only")return!1;let l=m$();if(l!==void 0&&!l.includes(iI))return!1;return!0}function i(o){return o.some((l)=>Gt(l,go))}
export{oye};
