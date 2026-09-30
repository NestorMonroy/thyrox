// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ch,gU}from"/$bunfs/root/chunk-bxhyh54r.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{Ye}from"/$bunfs/root/chunk-g6a51st9.js";import{Co}from"/$bunfs/root/chunk-ff0zt7cd.js";import{Lt}from"/$bunfs/root/chunk-hsxntwga.js";import{Tf}from"/$bunfs/root/chunk-6gemzwqw.js";import{Ix}from"/$bunfs/root/chunk-xm2ymsqp.js";import{lo}from"/$bunfs/root/chunk-m8xpr5yd.js";import{CF,Zq}from"/$bunfs/root/chunk-av25dwfn.js";function _we(o){let l=Co();return l.workflowAuthoringSkillAvailable??=e(),l.workflowAuthoringSkillAvailable&&!Zq(Ix)&&(o===void 0||i(o))}function e(){if(!Tf())return!1;if(CF()||Ch())return!1;if(a.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=Ye().skillOverrides?.[Ix];if(o==="off"||o==="user-invocable-only")return!1;let l=gU();if(l!==void 0&&!l.includes(Ix))return!1;return!0}function i(o){return o.some((l)=>Lt(l,lo))}
export{_we};
