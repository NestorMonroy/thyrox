// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Oe,To}from"/$bunfs/root/chunk-aw1peprz.js";import{Bl}from"/$bunfs/root/chunk-6ghkw3jc.js";import{p}from"/$bunfs/root/chunk-dtjhjxgx.js";import{ce,dAt}from"/$bunfs/root/chunk-2dddssw4.js";function o(n){let e=n?.trim();return e?e:void 0}function r(n){return n===void 0?void 0:String(n)}var d=p(()=>dAt(r,ce().optional().transform(o))),s=p(()=>dAt(r,ce().optional())),u=p(()=>dAt(r,ce().optional().transform((n)=>Oe(n)))),f=p(()=>dAt(r,ce().optional().transform((n)=>{if(Oe(n))return!0;if(To(n))return!1;return}))),m=p(()=>t());function yJr(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var O={str:()=>d(),rawStr:()=>s(),bool:()=>u(),triBool:()=>f(),int:(n)=>n?t(n):m(),enum:(n)=>dAt(r,ce().optional().transform((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0))};function t(n){return dAt(r,ce().optional().transform((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let i=Bl(e);if(!Number.isFinite(i))return;if(n?.min!==void 0&&i<n.min)return;if(n?.max!==void 0&&i>n.max)return;return i}))}
export{yJr,O};
