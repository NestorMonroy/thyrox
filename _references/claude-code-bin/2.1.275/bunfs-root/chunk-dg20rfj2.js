// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Pf,kF,H8,Zut,_W,iLe}from"/$bunfs/root/chunk-q2gh92k2.js";function r(e,t){let n=Pf(),c=_W(e,t),o=iLe(e,t),a=!(kF()&&!H8(e,t));return{enabled:n,effectiveWindow:c,threshold:o,enforced:a,source:Zut(e,t)}}function nhr(e){let t;return{notify(n,c){let o=r(n,c);if(t!==void 0&&nIn(t,o))return;t=o,e(o)},reset(){t=void 0}}}function nIn(e,t){return e.enabled===t.enabled&&e.effectiveWindow===t.effectiveWindow&&e.threshold===t.threshold&&e.enforced===t.enforced&&e.source===t.source}
export{nhr,nIn};
