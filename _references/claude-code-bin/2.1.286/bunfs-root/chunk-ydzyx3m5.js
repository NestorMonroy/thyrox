// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{xe}from"/$bunfs/root/chunk-4m0gdr8h.js";import{Ft,Ce,X,D}from"/$bunfs/root/chunk-mqace48v.js";import{PFt}from"/$bunfs/root/chunk-0ehjq4e3.js";D();var OI=Ft(null),XCn=Ft(null),JCn=Ft(null);function fvt(){let e=Ce(JCn);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var QCn=Ft(null);function dB(){let e=Ce(QCn);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function Ov(){let e=Ce(XCn);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Ce(OI);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function W(e){let n=t();return xe(n,e)}function wn(){return t().setState}function tar(){let e=t();return X(()=>PFt(e.setState),[e])}function Er(){return t()}function qo(e){return xe(Ce(OI),e)}
export{OI,XCn,JCn,fvt,QCn,dB,Ov,W,wn,tar,Er,qo};
