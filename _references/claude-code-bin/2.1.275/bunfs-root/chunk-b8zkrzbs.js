// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Yi,ps}from"/$bunfs/root/chunk-gfewy5rb.js";import{DO,eEe,Cct,OH,dL,pE}from"/$bunfs/root/chunk-q2gh92k2.js";import{Xr}from"/$bunfs/root/chunk-4m9qp5rm.js";import{realpathSync as u}from"fs";var Nre=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function hrn(r,e){let n=DO(r),t=DO(e);if(OH(n)||OH(t))return!0;if(n.skipped!==t.skipped)return!0;return eEe(n,t)}function Gwe(r,e){if(ps(r)||Yi(r))return[];let n=Xr(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=pE(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>dL(o,e)!=="same")}function xOe(r,e){if(ps(r)||Yi(r))return[];let n=Xr(r),t=n!==null&&n!==void 0?[n]:pE(r);return e===void 0?t:t.filter((s)=>dL(s,e)!=="same")}function Pde(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=dL(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!hrn(s,r)}))return!1;if(n?.requireCovered===!0){let s=DO(r);if(OH(s))return!1;let o=(a)=>a.some((c)=>{let i=DO(c);if(OH(i))return!1;return Cct(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{Nre,hrn,Gwe,xOe,Pde};
