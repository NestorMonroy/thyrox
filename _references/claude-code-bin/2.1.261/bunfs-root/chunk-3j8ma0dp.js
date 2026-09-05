// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Ag,NN}from"/$bunfs/root/chunk-annedm50.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{ze}from"/$bunfs/root/chunk-2e0agwm9.js";import{Ei}from"/$bunfs/root/chunk-s1cxej39.js";import{Lc}from"/$bunfs/root/chunk-xrpkk2fp.js";import{so}from"/$bunfs/root/chunk-kqfb6t3v.js";import{qt}from"/$bunfs/root/chunk-10nvcevy.js";import{NE}from"/$bunfs/root/chunk-9bzspx3s.js";import{U_}from"/$bunfs/root/chunk-t0xxsjdv.js";function Vee(o){let l=Ei();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Lc())return!1;if(U_()||Ag())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=ze().skillOverrides?.[NE];if(o==="off"||o==="user-invocable-only")return!1;let l=NN();if(l!==void 0&&!l.includes(NE))return!1;return!0}function i(o){return o.some((l)=>qt(l,so))}
export{Vee};
