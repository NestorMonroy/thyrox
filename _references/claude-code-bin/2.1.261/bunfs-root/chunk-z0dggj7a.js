// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Me}from"/$bunfs/root/chunk-ntg67f0z.js";import{Qt,De,q,F}from"/$bunfs/root/chunk-gwyyj914.js";import{bEt}from"/$bunfs/root/chunk-9j72twq2.js";F();var qP=Qt(null),C0t=Qt(null),R0t=Qt(null);function aWe(){let e=De(R0t);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var I0t=Qt(null);function Q4(){let e=De(I0t);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function ay(){let e=De(C0t);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=De(qP);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function B(e){let n=t();return Me(n,e)}function xt(){return t().setState}function Ven(){let e=t();return q(()=>bEt(e.setState),[e])}function Yn(){return t()}function Ps(e){return Me(De(qP),e)}
export{qP,C0t,R0t,aWe,I0t,Q4,ay,B,xt,Ven,Yn,Ps};
