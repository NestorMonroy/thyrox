// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{cSt,ZC,qYe}from"/$bunfs/root/chunk-0f1244y5.js";import{wC,Ocn,Ncn,gH}from"/$bunfs/root/chunk-m86gk47f.js";function u8(){return wC().cachedSystemTheme()??s()??"dark"}function iKn(){return wC().cachedSystemTheme()??s()}function Gft(){return wC().cachedSystemTheme()}function Wft(e){wC().setSystemTheme(e)}function s0e(e){return wC().onSystemThemeChange(e)}function Q4e(e){if(e==="auto")return u8();if(cSt(e))return e;let t=gH(e);return t&&Ocn(t)||"dark"}function oX(e){let t=ZC(Q4e(e)),n=gH(e);if(!n)return t;return qYe(t,Ncn(n)?.overrides)}function sKn(e){let t=i(e);if(!t)return;return 0.2126*t.r+0.7152*t.g+0.0722*t.b>0.5?"light":"dark"}function i(e){let t=/^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(e);if(t)return{r:m(t[1]),g:m(t[2]),b:m(t[3])};let n=/^#([0-9a-f]+)$/i.exec(e);if(n&&n[1].length%3===0){let r=n[1],o=r.length/3;return{r:m(r.slice(0,o)),g:m(r.slice(o,2*o)),b:m(r.slice(2*o))}}return}function m(e){let t=16**e.length-1;return parseInt(e,16)/t}function s(){let e=a.COLORFGBG;if(!e)return;let n=e.split(";").at(-1);if(n===void 0||n==="")return;let r=Number(n);if(!Number.isInteger(r)||r<0||r>15)return;return r<=6||r===8?"dark":"light"}
export{u8,iKn,Gft,Wft,s0e,Q4e,oX,sKn};
