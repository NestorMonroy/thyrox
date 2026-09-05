// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as f}from"/$bunfs/root/_837.js";import{lstatSync as a,readFileSync as g,rmSync as l,unlinkSync as x,writeFileSync as c}from"fs";import{join as i}from"path";function y(n,e){let t=e??process.env.CLAUDE_JOB_DIR;if(!t)return;try{c(i(t,o),n)}catch{}}function S(n,e,t){let r=t??process.env.CLAUDE_JOB_DIR,s=e.trim();if(!r||!s)return;try{c(i(r,d),`${n}
${s.slice(0,A)}`)}catch{}}function m(n){return u(i(n,o))}function B(n,e){let t=u(i(n,d));if(!t)return;let r=t.indexOf(`
`);return r!==-1&&t.slice(0,r)===e?t.slice(r+1):void 0}function u(n){try{let e=a(n);if(!e.isFile()||e.size>65536){try{l(n,{recursive:!0,force:!0})}catch{}return}let t=g(n,"utf8");return x(n),t}catch{return}}var o="exit-cause",d="exit-detail",A=200;var C=()=>{};
export{y as Khd,S as Lhd,m as Mhd,B as Nhd,C as Ohd};
