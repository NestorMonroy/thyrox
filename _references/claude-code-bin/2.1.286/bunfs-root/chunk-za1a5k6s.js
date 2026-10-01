// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Le,ks}from"/$bunfs/root/chunk-dj0a6j9w.js";import{nc}from"/$bunfs/root/chunk-xz4v1m80.js";function i(n){return{parse:(e)=>n(u(e))}}function t(n){let e=n?.trim();return e?e:void 0}function u(n){return n===void 0?void 0:String(n)}var f=i(t),o=i((n)=>n),s=i((n)=>Le(n)),l=i((n)=>{if(Le(n))return!0;if(ks(n))return!1;return}),m=d();function O4o(n){if(typeof n==="boolean")return n?"1":"0";return String(n)}var H={str:()=>f,rawStr:()=>o,bool:()=>s,triBool:()=>l,int:(n)=>n?d(n):m,enum:(n)=>i((e)=>e!==void 0&&n.includes(e.trim())?e.trim():void 0)};function d(n){return i((e)=>{if(e===void 0)return;if(n?.digitsOnly&&!/^[+-]?\d+$/.test(e.trim()))return;let r=nc(e);if(!Number.isFinite(r))return;if(n?.min!==void 0&&r<n.min)return;if(n?.max!==void 0&&r>n.max)return;return r})}
export{O4o,H};
