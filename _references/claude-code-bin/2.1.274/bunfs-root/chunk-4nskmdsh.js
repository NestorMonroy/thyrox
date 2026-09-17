// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Am,rD}from"/$bunfs/root/chunk-ja309z9r.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{Ve}from"/$bunfs/root/chunk-m0am9fba.js";import{Hs}from"/$bunfs/root/chunk-mtq3m0rn.js";import{Lt}from"/$bunfs/root/chunk-gx4tznbd.js";import{po}from"/$bunfs/root/chunk-27bj2wbx.js";import{Mu}from"/$bunfs/root/chunk-yczma5hw.js";import{fC}from"/$bunfs/root/chunk-t13sjz5v.js";import{Oy}from"/$bunfs/root/chunk-5m06752x.js";function Fce(o){let l=Hs();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Mu())return!1;if(Oy()||Am())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Ve().skillOverrides?.[fC];if(o==="off"||o==="user-invocable-only")return!1;let l=rD();if(l!==void 0&&!l.includes(fC))return!1;return!0}function i(o){return o.some((l)=>Lt(l,po))}
export{Fce};
