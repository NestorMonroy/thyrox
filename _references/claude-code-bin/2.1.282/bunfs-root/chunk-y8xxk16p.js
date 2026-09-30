// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{kg,x$}from"/$bunfs/root/chunk-zwm3fybx.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{Ke}from"/$bunfs/root/chunk-verj0kzw.js";import{_o}from"/$bunfs/root/chunk-pvy21nwr.js";import{Wt}from"/$bunfs/root/chunk-1g1dfcph.js";import{eo}from"/$bunfs/root/chunk-wbbthbh9.js";import{Fp}from"/$bunfs/root/chunk-1kqpjzff.js";import{EI}from"/$bunfs/root/chunk-qt64yd4t.js";import{yb}from"/$bunfs/root/chunk-5xzkx242.js";function y_e(o){let l=_o();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&(o===void 0||i(o))}function e(){if(!Fp())return!1;if(yb()||kg())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Ke().skillOverrides?.[EI];if(o==="off"||o==="user-invocable-only")return!1;let l=x$();if(l!==void 0&&!l.includes(EI))return!1;return!0}function i(o){return o.some((l)=>Wt(l,eo))}
export{y_e};
