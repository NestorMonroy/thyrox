// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Le,Vo}from"/$bunfs/root/chunk-37s48y77.js";import{Zl}from"/$bunfs/root/chunk-0j2vcydt.js";import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{de,azt}from"/$bunfs/root/chunk-4mrm0wbk.js";function o(n){let e=n?.trim();return e?e:void 0}function r(n){return n===void 0?void 0:String(n)}var d=f(()=>azt(r,de().optional().transform(o))),s=f(()=>azt(r,de().optional())),u=f(()=>azt(r,de().optional().transform((n)=>Le(n)))),m=f(()=>azt(r,de().optional().transform((n)=>{if(Le(n))return!0;if(Vo(n))return!1;return}))),a=f(()=>t());function Nzo(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var M={str:()=>d(),rawStr:()=>s(),bool:()=>u(),triBool:()=>m(),int:(n)=>n?t(n):a(),enum:(n)=>azt(r,de().optional().transform((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0))};function t(n){return azt(r,de().optional().transform((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let i=Zl(e);if(!Number.isFinite(i))return;if(n?.min!==void 0&&i<n.min)return;if(n?.max!==void 0&&i>n.max)return;return i}))}
export{Nzo,M};
