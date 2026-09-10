// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{h}from"/$bunfs/root/chunk-6rkpsn9e.js";import{xo}from"/$bunfs/root/chunk-a3w4apvy.js";var Rpt="in-process";class C4n{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var XSr=new V(()=>new C4n);function o(){return XSr.of(z().host)}function Txr(e){o().setCliOverride(e)}function jdn(){return o().cliOverride}function Gdn(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function Wdn(){return o().captured!==null}function $1t(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(xo("teammateMode",Rpt).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function $0e(){let e=o();if(e.captured===null)h(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),$1t();return e.captured??Rpt}
export{Rpt,C4n,XSr,Txr,jdn,Gdn,Wdn,$1t,$0e};
