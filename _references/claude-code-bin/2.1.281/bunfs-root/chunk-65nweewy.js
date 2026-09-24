// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Oe,Ao}from"/$bunfs/root/chunk-4a5nddj6.js";import{gc}from"/$bunfs/root/chunk-8bp13hnn.js";import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{de,mNt}from"/$bunfs/root/chunk-na4z7wr9.js";function o(n){let e=n?.trim();return e?e:void 0}function r(n){return n===void 0?void 0:String(n)}var d=f(()=>mNt(r,de().optional().transform(o))),s=f(()=>mNt(r,de().optional())),u=f(()=>mNt(r,de().optional().transform((n)=>Oe(n)))),m=f(()=>mNt(r,de().optional().transform((n)=>{if(Oe(n))return!0;if(Ao(n))return!1;return}))),a=f(()=>t());function HCo(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var M={str:()=>d(),rawStr:()=>s(),bool:()=>u(),triBool:()=>m(),int:(n)=>n?t(n):a(),enum:(n)=>mNt(r,de().optional().transform((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0))};function t(n){return mNt(r,de().optional().transform((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let i=gc(e);if(!Number.isFinite(i))return;if(n?.min!==void 0&&i<n.min)return;if(n?.max!==void 0&&i>n.max)return;return i}))}
export{HCo,M};
