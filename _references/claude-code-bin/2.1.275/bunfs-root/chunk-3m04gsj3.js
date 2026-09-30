// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Me}from"/$bunfs/root/chunk-v3vk40d1.js";import{Xt,De,X,D}from"/$bunfs/root/chunk-347kpssc.js";import{Pyt}from"/$bunfs/root/chunk-kfdfjv5x.js";D();var QT=Xt(null),b7t=Xt(null),S7t=Xt(null);function vnt(){let e=De(S7t);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var w7t=Xt(null);function RJ(){let e=De(w7t);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function $b(){let e=De(b7t);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=De(QT);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function B(e){let n=t();return Me(n,e)}function qt(){return t().setState}function V0n(){let e=t();return X(()=>Pyt(e.setState),[e])}function hr(){return t()}function di(e){return Me(De(QT),e)}
export{QT,b7t,S7t,vnt,w7t,RJ,$b,B,qt,V0n,hr,di};
