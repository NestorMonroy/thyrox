// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Le,bs}from"/$bunfs/root/chunk-fkak21hw.js";import{ql}from"/$bunfs/root/chunk-v34cw0y6.js";import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{de,jzt}from"/$bunfs/root/chunk-dh83tebh.js";function o(n){let e=n?.trim();return e?e:void 0}function r(n){return n===void 0?void 0:String(n)}var d=p(()=>jzt(r,de().optional().transform(o))),s=p(()=>jzt(r,de().optional())),u=p(()=>jzt(r,de().optional().transform((n)=>Le(n)))),f=p(()=>jzt(r,de().optional().transform((n)=>{if(Le(n))return!0;if(bs(n))return!1;return}))),m=p(()=>t());function Y2o(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var M={str:()=>d(),rawStr:()=>s(),bool:()=>u(),triBool:()=>f(),int:(n)=>n?t(n):m(),enum:(n)=>jzt(r,de().optional().transform((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0))};function t(n){return jzt(r,de().optional().transform((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let i=ql(e);if(!Number.isFinite(i))return;if(n?.min!==void 0&&i<n.min)return;if(n?.max!==void 0&&i>n.max)return;return i}))}
export{Y2o,M};
