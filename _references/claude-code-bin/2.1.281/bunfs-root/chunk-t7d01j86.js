// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{xe}from"/$bunfs/root/chunk-8k0g6zky.js";import{Vt,Pe,J,D}from"/$bunfs/root/chunk-av0brfrs.js";import{EIt}from"/$bunfs/root/chunk-bwbakz7z.js";D();var lx=Vt(null),_gn=Vt(null),bgn=Vt(null);function Kft(){let e=Pe(bgn);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var Sgn=Vt(null);function P$(){let e=Pe(Sgn);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function mw(){let e=Pe(_gn);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Pe(lx);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function U(e){let n=t();return xe(n,e)}function ln(){return t().setState}function T6n(){let e=t();return J(()=>EIt(e.setState),[e])}function Er(){return t()}function hs(e){return xe(Pe(lx),e)}
export{lx,_gn,bgn,Kft,Sgn,P$,mw,U,ln,T6n,Er,hs};
