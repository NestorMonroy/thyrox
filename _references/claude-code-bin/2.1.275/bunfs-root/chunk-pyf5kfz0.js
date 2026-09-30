// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Dm,SD}from"/$bunfs/root/chunk-4qqe0nh4.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{Ve}from"/$bunfs/root/chunk-v49f6nqy.js";import{vs}from"/$bunfs/root/chunk-2pr871ag.js";import{Bt}from"/$bunfs/root/chunk-3qftbphc.js";import{mo}from"/$bunfs/root/chunk-xbd48fav.js";import{Gu}from"/$bunfs/root/chunk-hy1xv27b.js";import{jC}from"/$bunfs/root/chunk-jjq7ev4g.js";import{jy}from"/$bunfs/root/chunk-8m55dkzf.js";function Wue(o){let l=vs();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Gu())return!1;if(jy()||Dm())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Ve().skillOverrides?.[jC];if(o==="off"||o==="user-invocable-only")return!1;let l=SD();if(l!==void 0&&!l.includes(jC))return!1;return!0}function i(o){return o.some((l)=>Bt(l,mo))}
export{Wue};
