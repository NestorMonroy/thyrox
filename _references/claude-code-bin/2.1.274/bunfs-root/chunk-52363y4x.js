// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Le}from"/$bunfs/root/chunk-h6vha6js.js";import{Kt,Me,X,L}from"/$bunfs/root/chunk-s59wj17y.js";import{_gt}from"/$bunfs/root/chunk-ydpmpkaw.js";L();var kT=Kt(null),VYt=Kt(null),KYt=Kt(null);function Aet(){let e=Me(KYt);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var YYt=Kt(null);function qX(){let e=Me(YYt);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function Tb(){let e=Me(VYt);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Me(kT);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function B(e){let n=t();return Le(n,e)}function qt(){return t().setState}function Oxn(){let e=t();return X(()=>_gt(e.setState),[e])}function mr(){return t()}function ni(e){return Le(Me(kT),e)}
export{kT,VYt,KYt,Aet,YYt,qX,Tb,B,qt,Oxn,mr,ni};
