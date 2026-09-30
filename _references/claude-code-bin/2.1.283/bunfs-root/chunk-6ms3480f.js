// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{xe}from"/$bunfs/root/chunk-kszhcdp6.js";import{Vt,Ie,X,L}from"/$bunfs/root/chunk-8fdrzdn0.js";import{TDt}from"/$bunfs/root/chunk-j7qjtsd3.js";L();var pI=Vt(null),xvn=Vt(null),Ivn=Vt(null);function i_t(){let e=Ie(Ivn);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var Pvn=Vt(null);function lU(){let e=Ie(Pvn);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function qw(){let e=Ie(xvn);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Ie(pI);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function W(e){let n=t();return xe(n,e)}function dn(){return t().setState}function Rer(){let e=t();return X(()=>TDt(e.setState),[e])}function Rr(){return t()}function ys(e){return xe(Ie(pI),e)}
export{pI,xvn,Ivn,i_t,Pvn,lU,qw,W,dn,Rer,Rr,ys};
