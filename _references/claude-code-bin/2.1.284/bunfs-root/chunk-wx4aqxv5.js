// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Pe}from"/$bunfs/root/chunk-q9byrn4w.js";import{zt,Ce,X,L}from"/$bunfs/root/chunk-68gegf2j.js";import{jNt}from"/$bunfs/root/chunk-v2jtzqr4.js";L();var AP=zt(null),vTn=zt(null),ETn=zt(null);function dSt(){let e=Ce(ETn);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var kTn=zt(null);function RU(){let e=Ce(kTn);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function uv(){let e=Ce(vTn);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Ce(AP);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function W(e){let n=t();return Pe(n,e)}function un(){return t().setState}function nor(){let e=t();return X(()=>jNt(e.setState),[e])}function kr(){return t()}function _s(e){return Pe(Ce(AP),e)}
export{AP,vTn,ETn,dSt,kTn,RU,uv,W,un,nor,kr,_s};
