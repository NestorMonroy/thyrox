// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Le,Wo}from"/$bunfs/root/chunk-2j44ssk9.js";import{Oc}from"/$bunfs/root/chunk-4cnes656.js";import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{de,Ijt}from"/$bunfs/root/chunk-hn75r78z.js";function o(n){let e=n?.trim();return e?e:void 0}function r(n){return n===void 0?void 0:String(n)}var d=f(()=>Ijt(r,de().optional().transform(o))),s=f(()=>Ijt(r,de().optional())),u=f(()=>Ijt(r,de().optional().transform((n)=>Le(n)))),m=f(()=>Ijt(r,de().optional().transform((n)=>{if(Le(n))return!0;if(Wo(n))return!1;return}))),a=f(()=>t());function LBo(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var M={str:()=>d(),rawStr:()=>s(),bool:()=>u(),triBool:()=>m(),int:(n)=>n?t(n):a(),enum:(n)=>Ijt(r,de().optional().transform((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0))};function t(n){return Ijt(r,de().optional().transform((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let i=Oc(e);if(!Number.isFinite(i))return;if(n?.min!==void 0&&i<n.min)return;if(n?.max!==void 0&&i>n.max)return;return i}))}
export{LBo,M};
