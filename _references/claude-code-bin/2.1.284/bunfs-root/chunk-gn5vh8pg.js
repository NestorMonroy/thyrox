// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{rh,uU}from"/$bunfs/root/chunk-d37h8mav.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{Je}from"/$bunfs/root/chunk-r03mjfax.js";import{ko}from"/$bunfs/root/chunk-j70276wn.js";import{Ut}from"/$bunfs/root/chunk-q3brtb9y.js";import{go}from"/$bunfs/root/chunk-swk3rjnt.js";import{Cf}from"/$bunfs/root/chunk-jdxze41m.js";import{SI}from"/$bunfs/root/chunk-ez35p4s3.js";import{Zb}from"/$bunfs/root/chunk-8209szsd.js";function bwe(o){let l=ko();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Cf())return!1;if(Zb()||rh())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Je().skillOverrides?.[SI];if(o==="off"||o==="user-invocable-only")return!1;let l=uU();if(l!==void 0&&!l.includes(SI))return!1;return!0}function i(o){return o.some((l)=>Ut(l,go))}
export{bwe};
