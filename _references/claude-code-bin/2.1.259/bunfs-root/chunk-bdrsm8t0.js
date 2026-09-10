// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{$f,r2,T8,$8e,JF,uwe}from"/$bunfs/root/chunk-qpwbvc04.js";function r(t,e){let n=$f(),c=JF(t,e),o=uwe(t,e),a=!(r2()&&!T8(t,e));return{enabled:n,effectiveWindow:c,threshold:o,enforced:a,source:$8e(t,e)}}function oBn(t){let e;return{notify(n,c){let o=r(n,c);if(e!==void 0&&UQt(e,o))return;e=o,t(o)},reset(){e=void 0}}}function UQt(t,e){return t.enabled===e.enabled&&t.effectiveWindow===e.effectiveWindow&&t.threshold===e.threshold&&t.enforced===e.enforced&&t.source===e.source}
export{oBn,UQt};
