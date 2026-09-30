// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{kon,eL,cHt}from"/$bunfs/root/chunk-k7mkzvfg.js";import{LD,xfr,Pfr,_C}from"/$bunfs/root/chunk-pbhh5j4d.js";function jse(){return LD().cachedSystemTheme()??s()??"dark"}function ico(){return LD().cachedSystemTheme()??s()}function Q8t(){return LD().cachedSystemTheme()}function oTt(e){LD().setSystemTheme(e)}function Stt(e){return LD().onSystemThemeChange(e)}function sTt(e){if(e==="auto")return jse();if(kon(e))return e;let t=_C(e);return t&&xfr(t)||"dark"}function QHe(e){let t=eL(sTt(e)),n=_C(e);if(!n)return t;return cHt(t,Pfr(n)?.overrides)}function aco(e){let t=i(e);if(!t)return;return 0.2126*t.r+0.7152*t.g+0.0722*t.b>0.5?"light":"dark"}function i(e){let t=/^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(e);if(t)return{r:m(t[1]),g:m(t[2]),b:m(t[3])};let n=/^#([0-9a-f]+)$/i.exec(e);if(n&&n[1].length%3===0){let r=n[1],o=r.length/3;return{r:m(r.slice(0,o)),g:m(r.slice(o,2*o)),b:m(r.slice(2*o))}}return}function m(e){let t=16**e.length-1;return parseInt(e,16)/t}function s(){let e=a.COLORFGBG;if(!e)return;let n=e.split(";").at(-1);if(n===void 0||n==="")return;let r=Number(n);if(!Number.isInteger(r)||r<0||r>15)return;return r<=6||r===8?"dark":"light"}
export{jse,ico,Q8t,oTt,Stt,sTt,QHe,aco};
