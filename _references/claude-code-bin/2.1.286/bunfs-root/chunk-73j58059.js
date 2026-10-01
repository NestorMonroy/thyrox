// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ta,_s}from"/$bunfs/root/chunk-4dvekan0.js";import{J$,ADe,TIt,AL,zB,lA}from"/$bunfs/root/chunk-kt4703ww.js";import{ys}from"/$bunfs/root/chunk-dsxed40r.js";import{realpathSync as u}from"fs";var Xfe=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function NOn(r,e){let n=J$(r),t=J$(e);if(AL(n)||AL(t))return!0;if(n.skipped!==t.skipped)return!0;return ADe(n,t)}function PHe(r,e){if(_s(r)||ta(r))return[];let n=ys(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=lA(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>zB(o,e)!=="same")}function Y2e(r,e){if(_s(r)||ta(r))return[];let n=ys(r),t=n!==null&&n!==void 0?[n]:lA(r);return e===void 0?t:t.filter((s)=>zB(s,e)!=="same")}function jve(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=zB(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!NOn(s,r)}))return!1;if(n?.requireCovered===!0){let s=J$(r);if(AL(s))return!1;let o=(a)=>a.some((c)=>{let i=J$(c);if(AL(i))return!1;return TIt(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{Xfe,NOn,PHe,Y2e,jve};
