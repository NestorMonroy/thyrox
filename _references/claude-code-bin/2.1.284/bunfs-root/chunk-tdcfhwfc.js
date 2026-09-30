// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{q,j}from"/$bunfs/root/chunk-d37h8mav.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{Fo}from"/$bunfs/root/chunk-xghj8qpt.js";var spn="in-process";class h0o{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var m4o=new q(()=>new h0o);function o(){return m4o.of(j().host)}function fXo(e){o().setCliOverride(e)}function _Nr(){return o().cliOverride}function bNr(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function SNr(){return o().captured!==null}function RKn(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Fo("teammateMode",spn).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function xut(){let e=o();if(e.captured===null)d(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),RKn();return e.captured??spn}
export{spn,h0o,m4o,fXo,_Nr,bNr,SNr,RKn,xut};
