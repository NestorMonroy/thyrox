// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Oe,ko}from"/$bunfs/root/chunk-zt13kgz5.js";import{wc}from"/$bunfs/root/chunk-37swe2q7.js";import{f}from"/$bunfs/root/chunk-f344jh32.js";import{de,XFt}from"/$bunfs/root/chunk-9mj2syww.js";function o(n){let e=n?.trim();return e?e:void 0}function r(n){return n===void 0?void 0:String(n)}var d=f(()=>XFt(r,de().optional().transform(o))),s=f(()=>XFt(r,de().optional())),u=f(()=>XFt(r,de().optional().transform((n)=>Oe(n)))),m=f(()=>XFt(r,de().optional().transform((n)=>{if(Oe(n))return!0;if(ko(n))return!1;return}))),a=f(()=>t());function nOo(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var M={str:()=>d(),rawStr:()=>s(),bool:()=>u(),triBool:()=>m(),int:(n)=>n?t(n):a(),enum:(n)=>XFt(r,de().optional().transform((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0))};function t(n){return XFt(r,de().optional().transform((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let i=wc(e);if(!Number.isFinite(i))return;if(n?.min!==void 0&&i<n.min)return;if(n?.max!==void 0&&i>n.max)return;return i}))}
export{nOo,M};
