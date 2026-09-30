// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{xe}from"/$bunfs/root/chunk-6ytv2kkh.js";import{Vt,Ie,J,D}from"/$bunfs/root/chunk-cvh5tjew.js";import{WHt}from"/$bunfs/root/chunk-k0p66s5d.js";D();var Tx=Vt(null),H_n=Vt(null),O_n=Vt(null);function Bgt(){let e=Ie(O_n);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var M_n=Vt(null);function J$(){let e=Ie(M_n);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function vw(){let e=Ie(H_n);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Ie(Tx);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function B(e){let n=t();return xe(n,e)}function cn(){return t().setState}function CXn(){let e=t();return J(()=>WHt(e.setState),[e])}function kr(){return t()}function us(e){return xe(Ie(Tx),e)}
export{Tx,H_n,O_n,Bgt,M_n,J$,vw,B,cn,CXn,kr,us};
