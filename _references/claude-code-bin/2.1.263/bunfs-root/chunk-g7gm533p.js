// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{ef,RM,w5,D5e,GF,Cwe}from"/$bunfs/root/chunk-9wa0ka8p.js";function r(t,e){let n=ef(),c=GF(t,e),o=Cwe(t,e),a=!(RM()&&!w5(t,e));return{enabled:n,effectiveWindow:c,threshold:o,enforced:a,source:D5e(t,e)}}function VNn(t){let e;return{notify(n,c){let o=r(n,c);if(e!==void 0&&N7t(e,o))return;e=o,t(o)},reset(){e=void 0}}}function N7t(t,e){return t.enabled===e.enabled&&t.effectiveWindow===e.effectiveWindow&&t.threshold===e.threshold&&t.enforced===e.enforced&&t.source===e.source}
export{VNn,N7t};
