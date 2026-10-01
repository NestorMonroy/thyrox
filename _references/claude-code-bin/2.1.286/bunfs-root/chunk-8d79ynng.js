// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{no}from"/$bunfs/root/chunk-hbjpbz2q.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{ND}from"/$bunfs/root/chunk-hqt9kt0y.js";import{Bn}from"/$bunfs/root/chunk-sygqycmd.js";function u(){if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)return!1;return!Bn()}function GWo(){return a.CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"&&!a.CLAUDE_CODE_BYOC_ENABLE_DATADOG}function l(){return a.CLAUDE_CODE_CUSTOM_OAUTH_URL!==void 0}function ah(){return u()||no()!==null||ND()||l()}function VWo(){return u()||no()!==null||l()}function cY(){return a.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL}function vj(){if(cY())return!1;return ND()}import{sep as f}from"path";var s2r=new Set([".git","hooks",".husky",".githooks","node_modules",".vscode",".idea","head","config","objects","refs",".claude","skills","commands","agents",".cargo",".devcontainer",".yarn",".mvn"]),F1t=/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/,i2r=new RegExp(F1t,"g");function Md(e){return c(e,!0)}function c_n(e){return c(e,!1)}function c(e,o){let n=e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017f/g,"s"),t=n.replace(i2r,"");return(o?t.replace(/:.*$/,""):t).replace(/[. ]+$/,"")||n}function a2r(e){return!1}function KK(e,o,n){let t=e.slice(o.length).split(f),i=t.length-1;for(let r=0;r<t.length;r++){let s=Md(t[r]);if(s2r.has(s)||a2r(s))return!0;if(r===i&&n?.has(s))return!0}return!1}
export{GWo,ah,VWo,cY,vj,s2r,F1t,i2r,Md,c_n,a2r,KK};
