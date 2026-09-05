// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Fe}from"/$bunfs/root/chunk-czaspe53.js";import{hn,We,V,j}from"/$bunfs/root/chunk-db688wrz.js";import{Ctr}from"/$bunfs/root/chunk-szt6v4n4.js";j();var cD=hn(null),yPt=hn(null);function gy(){let t=We(yPt);if(!t)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return t}function e(){let t=We(cD);if(!t)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return t}function G(t){let o=e();return Fe(o,t)}function $t(){return e().setState}function FZt(){let t=e();return V(()=>Ctr(t.setState),[t])}function Un(){return e()}function Di(t){return Fe(We(cD),t)}
export{cD,yPt,gy,G,$t,FZt,Un,Di};
