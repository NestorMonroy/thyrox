// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{A2b as d,C2b as g,F2b as i,L2b as b,y2b as o,z2b as S}from"/$bunfs/root/_629.js";import{T2b as h,V2b as c,X2b as f,Z2b as y}from"/$bunfs/root/_630.js";import{Tbd as p}from"/$bunfs/root/_811.js";import{ncd as u}from"/$bunfs/root/_812.js";import{xxd as T}from"/$bunfs/root/_837.js";function l(){return o().cachedSystemTheme()??a()??"dark"}function F(){return o().cachedSystemTheme()??a()}function B(){return o().cachedSystemTheme()}function M(e){o().setSystemTheme(e)}function G(e){return o().onSystemThemeChange(e)}function x(e){if(e==="auto")return l();if(h(e))return e;let t=i(e);return t&&d(t)||"dark"}function I(e){let t=c(x(e)),n=i(e);if(!n)return t;return f(t,g(n)?.overrides)}function L(e){let t=C(e);if(!t)return;return 0.2126*t.r+0.7152*t.g+0.0722*t.b>0.5?"light":"dark"}function C(e){let t=/^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(e);if(t)return{r:m(t[1]),g:m(t[2]),b:m(t[3])};let n=/^#([0-9a-f]+)$/i.exec(e);if(n&&n[1].length%3===0){let r=n[1],s=r.length/3;return{r:m(r.slice(0,s)),g:m(r.slice(s,2*s)),b:m(r.slice(2*s))}}return}function m(e){let t=16**e.length-1;return parseInt(e,16)/t}function a(){let e=u.COLORFGBG;if(!e)return;let n=e.split(";").at(-1);if(n===void 0||n==="")return;let r=Number(n);if(!Number.isInteger(r)||r<0||r>15)return;return r<=6||r===8?"dark":"light"}var v=T(()=>{b();p();y();S()});
export{l as n2b,F as o2b,B as p2b,M as q2b,G as r2b,x as s2b,I as t2b,L as u2b,v as v2b};
