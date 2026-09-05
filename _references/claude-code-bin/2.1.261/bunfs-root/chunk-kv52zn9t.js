// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{Cbt,xC,x6e}from"/$bunfs/root/chunk-bkjsth7q.js";import{aC,xln,Lln,ZS}from"/$bunfs/root/chunk-0bg83zc0.js";function q9(){return aC().cachedSystemTheme()??s()??"dark"}function EVn(){return aC().cachedSystemTheme()??s()}function Jft(){return aC().cachedSystemTheme()}function Qft(e){aC().setSystemTheme(e)}function g0e(e){return aC().onSystemThemeChange(e)}function x4e(e){if(e==="auto")return q9();if(Cbt(e))return e;let t=ZS(e);return t&&xln(t)||"dark"}function LY(e){let t=xC(x4e(e)),n=ZS(e);if(!n)return t;return x6e(t,Lln(n)?.overrides)}function AVn(e){let t=i(e);if(!t)return;return 0.2126*t.r+0.7152*t.g+0.0722*t.b>0.5?"light":"dark"}function i(e){let t=/^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(e);if(t)return{r:m(t[1]),g:m(t[2]),b:m(t[3])};let n=/^#([0-9a-f]+)$/i.exec(e);if(n&&n[1].length%3===0){let r=n[1],o=r.length/3;return{r:m(r.slice(0,o)),g:m(r.slice(o,2*o)),b:m(r.slice(2*o))}}return}function m(e){let t=16**e.length-1;return parseInt(e,16)/t}function s(){let e=a.COLORFGBG;if(!e)return;let n=e.split(";").at(-1);if(n===void 0||n==="")return;let r=Number(n);if(!Number.isInteger(r)||r<0||r>15)return;return r<=6||r===8?"dark":"light"}
export{q9,EVn,Jft,Qft,g0e,x4e,LY,AVn};
