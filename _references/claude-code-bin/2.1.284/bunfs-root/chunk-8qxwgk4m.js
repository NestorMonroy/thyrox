// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{po}from"/$bunfs/root/chunk-d37h8mav.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{tD}from"/$bunfs/root/chunk-320rdak1.js";import{qn}from"/$bunfs/root/chunk-12vsw1j8.js";function u(){if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)return!1;return!qn()}function EUo(){return a.CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"&&!a.CLAUDE_CODE_BYOC_ENABLE_DATADOG}function l(){return a.CLAUDE_CODE_CUSTOM_OAUTH_URL!==void 0}function Kg(){return u()||po()!==null||tD()||l()}function kUo(){return u()||po()!==null||l()}function P6(){return a.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL}function QL(){if(P6())return!1;return tD()}import{sep as f}from"path";var KUt=new Set([".git","hooks",".husky",".githooks","node_modules",".vscode",".idea","head","config","objects","refs",".claude","skills","commands","agents",".cargo",".devcontainer",".yarn",".mvn"]),YUt=/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/,E=new RegExp(YUt,"g");function Ji(e){return c(e,!0)}function TUo(e){return c(e,!1)}function c(e,o){let n=e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017f/g,"s"),t=n.replace(E,"");return(o?t.replace(/:.*$/,""):t).replace(/[. ]+$/,"")||n}function Sjr(e){return!1}function gK(e,o,n){let t=e.slice(o.length).split(f),i=t.length-1;for(let r=0;r<t.length;r++){let s=Ji(t[r]);if(KUt.has(s)||Sjr(s))return!0;if(r===i&&n?.has(s))return!0}return!1}
export{EUo,Kg,kUo,P6,QL,KUt,YUt,Ji,TUo,Sjr,gK};
