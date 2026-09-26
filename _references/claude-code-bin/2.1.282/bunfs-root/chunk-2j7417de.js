// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ap,Nm,tj,I7,okt,yK,Lze}from"/$bunfs/root/chunk-c9jscxk0.js";function s(e,t){let c=Nm(),o=ap(e),n=yK(o,t),a=Lze(o,t),r=!(tj()&&!I7(o,t));return{enabled:c,effectiveWindow:n,threshold:a,enforced:r,source:okt(o,t)}}function XWr(e){let t;return{notify(c,o){let n=s(c,o);if(t!==void 0&&_3n(t,n))return;t=n,e(n)},reset(){t=void 0}}}function _3n(e,t){return e.enabled===t.enabled&&e.effectiveWindow===t.effectiveWindow&&e.threshold===t.threshold&&e.enforced===t.enforced&&e.source===t.source}
export{XWr,_3n};
