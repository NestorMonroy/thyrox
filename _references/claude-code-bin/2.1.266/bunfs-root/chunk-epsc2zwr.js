// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{zg,VF}from"/$bunfs/root/chunk-t8q7n4ta.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{Ge}from"/$bunfs/root/chunk-kcxa79n8.js";import{bi}from"/$bunfs/root/chunk-6mran53g.js";import{Bc}from"/$bunfs/root/chunk-pbnppgd9.js";import{io}from"/$bunfs/root/chunk-fmze7yw8.js";import{Wt}from"/$bunfs/root/chunk-ha3c8j0p.js";import{hk}from"/$bunfs/root/chunk-1z1etq0d.js";import{oh}from"/$bunfs/root/chunk-mytqkyz5.js";function fne(o){let l=bi();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Bc())return!1;if(oh()||zg())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Ge().skillOverrides?.[hk];if(o==="off"||o==="user-invocable-only")return!1;let l=VF();if(l!==void 0&&!l.includes(hk))return!1;return!0}function i(o){return o.some((l)=>Wt(l,io))}
export{fne};
