// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Dg,nF}from"/$bunfs/root/chunk-x1rrg5j2.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{Je}from"/$bunfs/root/chunk-67nd7etf.js";import{Ls}from"/$bunfs/root/chunk-0xd0k64r.js";import{en}from"/$bunfs/root/chunk-r8hc3n2z.js";import{MSe}from"/$bunfs/root/chunk-jc22e3ae.js";import{xc}from"/$bunfs/root/chunk-hnqd864x.js";import{AA}from"/$bunfs/root/chunk-fxf5eq5t.js";import{uo}from"/$bunfs/root/chunk-m231vdpd.js";import{A_}from"/$bunfs/root/chunk-f6ht09n5.js";function Ute(o){let l=Ls();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!xc()||MSe())return!1;if(A_()||Dg())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Je().skillOverrides?.[AA];if(o==="off"||o==="user-invocable-only")return!1;let l=nF();if(l!==void 0&&!l.includes(AA))return!1;return!0}function i(o){return o.some((l)=>en(l,uo))}
export{Ute};
