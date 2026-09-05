// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Fe}from"/$bunfs/root/chunk-y9yvkcas.js";import{_n,ze,K,j}from"/$bunfs/root/chunk-w71cs9yg.js";import{kor}from"/$bunfs/root/chunk-31e4aq9f.js";j();var HD=_n(null),g0t=_n(null);function wy(){let t=ze(g0t);if(!t)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return t}function e(){let t=ze(HD);if(!t)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return t}function G(t){let o=e();return Fe(o,t)}function $t(){return e().setState}function snn(){let t=e();return K(()=>kor(t.setState),[t])}function jn(){return e()}function Oi(t){return Fe(ze(HD),t)}
export{HD,g0t,wy,G,$t,snn,jn,Oi};
