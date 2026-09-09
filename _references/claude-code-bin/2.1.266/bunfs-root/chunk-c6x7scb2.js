// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{De}from"/$bunfs/root/chunk-5tjar31g.js";import{Kt,Oe,q,L}from"/$bunfs/root/chunk-v21q572m.js";import{dTt}from"/$bunfs/root/chunk-xjq10gh9.js";L();var YM=Kt(null),ILt=Kt(null),PLt=Kt(null);function TVe(){let e=Oe(PLt);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var HLt=Kt(null);function m6(){let e=Oe(HLt);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function Ty(){let e=Oe(ILt);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Oe(YM);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function F(e){let n=t();return De(n,e)}function Ot(){return t().setState}function Ton(){let e=t();return q(()=>dTt(e.setState),[e])}function er(){return t()}function Ps(e){return De(Oe(YM),e)}
export{YM,ILt,PLt,TVe,HLt,m6,Ty,F,Ot,Ton,er,Ps};
