// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{vg,FN}from"/$bunfs/root/chunk-k6vqz9fa.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{ze}from"/$bunfs/root/chunk-xnx53tr1.js";import{Ei}from"/$bunfs/root/chunk-tjx05rry.js";import{Lc}from"/$bunfs/root/chunk-kqgfqd68.js";import{so}from"/$bunfs/root/chunk-n168csnx.js";import{qt}from"/$bunfs/root/chunk-gp8z5n9k.js";import{NE}from"/$bunfs/root/chunk-zgspjsy8.js";import{U_}from"/$bunfs/root/chunk-tvqbt3g5.js";function Kee(o){let l=Ei();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Lc())return!1;if(U_()||vg())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=ze().skillOverrides?.[NE];if(o==="off"||o==="user-invocable-only")return!1;let l=FN();if(l!==void 0&&!l.includes(NE))return!1;return!0}function i(o){return o.some((l)=>qt(l,so))}
export{Kee};
