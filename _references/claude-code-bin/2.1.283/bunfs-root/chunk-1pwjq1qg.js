// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Yi,ns}from"/$bunfs/root/chunk-yqm14hey.js";import{YN,_Me,DAt,ED,zU,AT}from"/$bunfs/root/chunk-csayct82.js";import{Lo}from"/$bunfs/root/chunk-m8ebe51k.js";import{realpathSync as u}from"fs";var gpe=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function TCn(r,e){let n=YN(r),t=YN(e);if(ED(n)||ED(t))return!0;if(n.skipped!==t.skipped)return!0;return _Me(n,t)}function kOe(r,e){if(ns(r)||Yi(r))return[];let n=Lo(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=AT(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>zU(o,e)!=="same")}function _Ge(r,e){if(ns(r)||Yi(r))return[];let n=Lo(r),t=n!==null&&n!==void 0?[n]:AT(r);return e===void 0?t:t.filter((s)=>zU(s,e)!=="same")}function qSe(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=zU(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!TCn(s,r)}))return!1;if(n?.requireCovered===!0){let s=YN(r);if(ED(s))return!1;let o=(a)=>a.some((c)=>{let i=YN(c);if(ED(i))return!1;return DAt(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{gpe,TCn,kOe,_Ge,qSe};
