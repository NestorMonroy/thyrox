// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{yp,Nf,kW,oZ,_Ct,B4,rVe}from"/$bunfs/root/chunk-csayct82.js";function s(e,t){let c=Nf(),o=yp(e),n=B4(o,t),a=rVe(o,t),r=!(kW()&&!oZ(o,t));return{enabled:c,effectiveWindow:n,threshold:a,enforced:r,source:_Ct(o,t)}}function I3r(e){let t;return{notify(c,o){let n=s(c,o);if(t!==void 0&&eJn(t,n))return;t=n,e(n)},reset(){t=void 0}}}function eJn(e,t){return e.enabled===t.enabled&&e.effectiveWindow===t.effectiveWindow&&e.threshold===t.threshold&&e.enforced===t.enforced&&e.source===t.source}
export{I3r,eJn};
