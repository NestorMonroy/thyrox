// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Rg,UN}from"/$bunfs/root/chunk-b1z7jvb2.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{Je}from"/$bunfs/root/chunk-0300m3ak.js";import{Ps}from"/$bunfs/root/chunk-n91qqthe.js";import{an}from"/$bunfs/root/chunk-8seefhsx.js";import{Sbe}from"/$bunfs/root/chunk-3860s2eg.js";import{Ac}from"/$bunfs/root/chunk-zqxcvx6m.js";import{dA}from"/$bunfs/root/chunk-0khpmnvx.js";import{co}from"/$bunfs/root/chunk-vgzzgy9z.js";import{h_}from"/$bunfs/root/chunk-8nkad3z7.js";function zee(o){let l=Ps();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Ac()||Sbe())return!1;if(h_()||Rg())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Je().skillOverrides?.[dA];if(o==="off"||o==="user-invocable-only")return!1;let l=UN();if(l!==void 0&&!l.includes(dA))return!1;return!0}function i(o){return o.some((l)=>an(l,co))}
export{zee};
