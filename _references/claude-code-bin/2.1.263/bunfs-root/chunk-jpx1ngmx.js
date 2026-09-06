// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Me}from"/$bunfs/root/chunk-31ra109q.js";import{Qt,De,q,F}from"/$bunfs/root/chunk-1c6mq242.js";import{SEt}from"/$bunfs/root/chunk-a4fh8a2g.js";F();var KP=Qt(null),R0t=Qt(null),I0t=Qt(null);function cWe(){let e=De(I0t);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var x0t=Qt(null);function e9(){let e=De(x0t);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function ly(){let e=De(R0t);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=De(KP);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function B(e){let n=t();return Me(n,e)}function xt(){return t().setState}function qen(){let e=t();return q(()=>SEt(e.setState),[e])}function Yn(){return t()}function Ps(e){return Me(De(KP),e)}
export{KP,R0t,I0t,cWe,x0t,e9,ly,B,xt,qen,Yn,Ps};
