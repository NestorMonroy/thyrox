// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Gh,KU}from"/$bunfs/root/chunk-hbjpbz2q.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Je}from"/$bunfs/root/chunk-j27hwf9z.js";import{Co}from"/$bunfs/root/chunk-xb9gk5ty.js";import{Nt}from"/$bunfs/root/chunk-22qvrdjq.js";import{Lf}from"/$bunfs/root/chunk-r1mpkkvs.js";import{jx}from"/$bunfs/root/chunk-144xev7j.js";import{uo}from"/$bunfs/root/chunk-gnsdrzvf.js";import{nU,AK}from"/$bunfs/root/chunk-dbygxad5.js";function uve(o){let l=Co();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&!AK(jx)&&(o===void 0||i(o))}function e(){if(!Lf())return!1;if(nU()||Gh())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Je().skillOverrides?.[jx];if(o==="off"||o==="user-invocable-only")return!1;let l=KU();if(l!==void 0&&!l.includes(jx))return!1;return!0}function i(o){return o.some((l)=>Nt(l,uo))}
export{uve};
