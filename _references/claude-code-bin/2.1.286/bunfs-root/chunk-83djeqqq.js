// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{hln,WL,cDt}from"/$bunfs/root/chunk-0xhvdj8h.js";import{yL,phr,fhr,zC}from"/$bunfs/root/chunk-xa8221h4.js";function Sie(){return yL().cachedSystemTheme()??s()??"dark"}function sfo(){return yL().cachedSystemTheme()??s()}function EXt(){return yL().cachedSystemTheme()}function $At(e){yL().setSystemTheme(e)}function Wnt(e){return yL().onSystemThemeChange(e)}function FAt(e){if(e==="auto")return Sie();if(hln(e))return e;let t=zC(e);return t&&phr(t)||"dark"}function VHe(e){let t=WL(FAt(e)),n=zC(e);if(!n)return t;return cDt(t,fhr(n)?.overrides)}function ifo(e){let t=i(e);if(!t)return;return 0.2126*t.r+0.7152*t.g+0.0722*t.b>0.5?"light":"dark"}function i(e){let t=/^rgba?:([0-9a-f]{1,4})\/([0-9a-f]{1,4})\/([0-9a-f]{1,4})/i.exec(e);if(t)return{r:m(t[1]),g:m(t[2]),b:m(t[3])};let n=/^#([0-9a-f]+)$/i.exec(e);if(n&&n[1].length%3===0){let r=n[1],o=r.length/3;return{r:m(r.slice(0,o)),g:m(r.slice(o,2*o)),b:m(r.slice(2*o))}}return}function m(e){let t=16**e.length-1;return parseInt(e,16)/t}function s(){let e=a.COLORFGBG;if(!e)return;let n=e.split(";").at(-1);if(n===void 0||n==="")return;let r=Number(n);if(!Number.isInteger(r)||r<0||r>15)return;return r<=6||r===8?"dark":"light"}
export{Sie,sfo,EXt,$At,Wnt,FAt,VHe,ifo};
