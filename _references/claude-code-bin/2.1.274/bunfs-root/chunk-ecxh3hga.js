// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Pe,Po}from"/$bunfs/root/chunk-tep8see7.js";import{zl}from"/$bunfs/root/chunk-53a5hn9r.js";import{f}from"/$bunfs/root/chunk-w8gsn0hm.js";import{ce,$vt}from"/$bunfs/root/chunk-4sackjsb.js";function o(n){let e=n?.trim();return e?e:void 0}function r(n){return n===void 0?void 0:String(n)}var d=f(()=>$vt(r,ce().optional().transform(o))),s=f(()=>$vt(r,ce().optional())),u=f(()=>$vt(r,ce().optional().transform((n)=>Pe(n)))),m=f(()=>$vt(r,ce().optional().transform((n)=>{if(Pe(n))return!0;if(Po(n))return!1;return}))),a=f(()=>t());function e6r(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var O={str:()=>d(),rawStr:()=>s(),bool:()=>u(),triBool:()=>m(),int:(n)=>n?t(n):a(),enum:(n)=>$vt(r,ce().optional().transform((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0))};function t(n){return $vt(r,ce().optional().transform((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let i=zl(e);if(!Number.isFinite(i))return;if(n?.min!==void 0&&i<n.min)return;if(n?.max!==void 0&&i>n.max)return;return i}))}
export{e6r,O};
