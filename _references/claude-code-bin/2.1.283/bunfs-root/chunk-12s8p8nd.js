// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Gg,UF}from"/$bunfs/root/chunk-nvht7ckf.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{Je}from"/$bunfs/root/chunk-ckctvm5v.js";import{bo}from"/$bunfs/root/chunk-r5p5y4t8.js";import{Gt}from"/$bunfs/root/chunk-3xz3ntyr.js";import{co}from"/$bunfs/root/chunk-t6pwageh.js";import{Qp}from"/$bunfs/root/chunk-c08bd3t2.js";import{lP}from"/$bunfs/root/chunk-1xmgqgce.js";import{Fb}from"/$bunfs/root/chunk-gg784amx.js";function uSe(o){let l=bo();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Qp())return!1;if(Fb()||Gg())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Je().skillOverrides?.[lP];if(o==="off"||o==="user-invocable-only")return!1;let l=UF();if(l!==void 0&&!l.includes(lP))return!1;return!0}function i(o){return o.some((l)=>Gt(l,co))}
export{uSe};
