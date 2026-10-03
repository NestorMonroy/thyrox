// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Qr}from"/$bunfs/root/chunk-bxhyh54r.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{d0}from"/$bunfs/root/chunk-hjabkkf1.js";import{zn}from"/$bunfs/root/chunk-n2v4180x.js";function u(){if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)return!1;return!zn()}function fUo(){return a.CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"&&!a.CLAUDE_CODE_BYOC_ENABLE_DATADOG}function l(){return a.CLAUDE_CODE_CUSTOM_OAUTH_URL!==void 0}function Gg(){return u()||Qr()!==null||d0()||l()}function mUo(){return u()||Qr()!==null||l()}function F6(){return a.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL}function aN(){if(F6())return!1;return d0()}import{sep as f}from"path";var Ojr=new Set([".git","hooks",".husky",".githooks","node_modules",".vscode",".idea","head","config","objects","refs",".claude","skills","commands","agents",".cargo",".devcontainer",".yarn",".mvn"]),CUt=/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/,Hjr=new RegExp(CUt,"g");function kd(e){return c(e,!0)}function Ign(e){return c(e,!1)}function c(e,o){let n=e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017f/g,"s"),t=n.replace(Hjr,"");return(o?t.replace(/:.*$/,""):t).replace(/[. ]+$/,"")||n}function Mjr(e){return!1}function SK(e,o,n){let t=e.slice(o.length).split(f),i=t.length-1;for(let r=0;r<t.length;r++){let s=kd(t[r]);if(Ojr.has(s)||Mjr(s))return!0;if(r===i&&n?.has(s))return!0}return!1}
export{fUo,Gg,mUo,F6,aN,Ojr,CUt,Hjr,kd,Ign,Mjr,SK};
