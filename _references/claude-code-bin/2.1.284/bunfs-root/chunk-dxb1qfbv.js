// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Vi,ms}from"/$bunfs/root/chunk-zy97v06w.js";import{w$,R0e,NRt,WD,cB,UT}from"/$bunfs/root/chunk-77kn462z.js";import{Bo}from"/$bunfs/root/chunk-hqy3a2gr.js";import{realpathSync as u}from"fs";var ufe=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function OPn(r,e){let n=w$(r),t=w$(e);if(WD(n)||WD(t))return!0;if(n.skipped!==t.skipped)return!0;return R0e(n,t)}function NHe(r,e){if(ms(r)||Vi(r))return[];let n=Bo(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=UT(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>cB(o,e)!=="same")}function Gze(r,e){if(ms(r)||Vi(r))return[];let n=Bo(r),t=n!==null&&n!==void 0?[n]:UT(r);return e===void 0?t:t.filter((s)=>cB(s,e)!=="same")}function Qwe(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=cB(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!OPn(s,r)}))return!1;if(n?.requireCovered===!0){let s=w$(r);if(WD(s))return!1;let o=(a)=>a.some((c)=>{let i=w$(c);if(WD(i))return!1;return NRt(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{ufe,OPn,NHe,Gze,Qwe};
