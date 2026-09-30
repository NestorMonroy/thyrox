// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{Io}from"/$bunfs/root/chunk-tvb857x1.js";var uNt="in-process";class MPr{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var hQr=new G(()=>new MPr);function o(){return hQr.of(W().host)}function Woo(e){o().setCliOverride(e)}function Szn(){return o().cliOverride}function wzn(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function vzn(){return o().captured!==null}function Pin(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Io("teammateMode",uNt).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function bKe(){let e=o();if(e.captured===null)d(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),Pin();return e.captured??uNt}
export{uNt,MPr,hQr,Woo,Szn,wzn,vzn,Pin,bKe};
