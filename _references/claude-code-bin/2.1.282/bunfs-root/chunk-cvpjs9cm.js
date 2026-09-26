// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ji,Vo}from"/$bunfs/root/chunk-f8tyjwrg.js";import{UL,iHe,TEt,RM,IF,sT}from"/$bunfs/root/chunk-c9jscxk0.js";import{Ro}from"/$bunfs/root/chunk-36kx407g.js";import{realpathSync as u}from"fs";var yde=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function Cvn(r,e){let n=UL(r),t=UL(e);if(RM(n)||RM(t))return!0;if(n.skipped!==t.skipped)return!0;return iHe(n,t)}function cIe(r,e){if(Vo(r)||ji(r))return[];let n=Ro(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=sT(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>IF(o,e)!=="same")}function eje(r,e){if(Vo(r)||ji(r))return[];let n=Ro(r),t=n!==null&&n!==void 0?[n]:sT(r);return e===void 0?t:t.filter((s)=>IF(s,e)!=="same")}function J_e(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=IF(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!Cvn(s,r)}))return!1;if(n?.requireCovered===!0){let s=UL(r);if(RM(s))return!1;let o=(a)=>a.some((c)=>{let i=UL(c);if(RM(i))return!1;return TEt(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{yde,Cvn,cIe,eje,J_e};
