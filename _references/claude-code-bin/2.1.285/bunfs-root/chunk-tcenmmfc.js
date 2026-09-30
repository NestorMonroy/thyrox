// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{xe}from"/$bunfs/root/chunk-fejmsdkd.js";import{Ft,Re,Y,D}from"/$bunfs/root/chunk-bqbammwz.js";import{SNt}from"/$bunfs/root/chunk-39gr7gnw.js";D();var TI=Ft(null),bTn=Ft(null),STn=Ft(null);function dSt(){let e=Re(STn);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var wTn=Ft(null);function xU(){let e=Re(wTn);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function yv(){let e=Re(bTn);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Re(TI);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function B(e){let n=t();return xe(n,e)}function pn(){return t().setState}function Jrr(){let e=t();return Y(()=>SNt(e.setState),[e])}function vr(){return t()}function us(e){return xe(Re(TI),e)}
export{TI,bTn,STn,dSt,wTn,xU,yv,B,pn,Jrr,vr,us};
