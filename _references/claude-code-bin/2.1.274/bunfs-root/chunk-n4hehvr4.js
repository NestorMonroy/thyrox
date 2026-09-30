// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,G}from"/$bunfs/root/chunk-ja309z9r.js";import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{Io}from"/$bunfs/root/chunk-n8xje69s.js";var LOt="in-process";class CAr{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var F5r=new W(()=>new CAr);function o(){return F5r.of(G().host)}function X7r(e){o().setCliOverride(e)}function gFn(){return o().cliOverride}function hFn(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function yFn(){return o().captured!==null}function Ann(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Io("teammateMode",LOt).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function lqe(){let e=o();if(e.captured===null)d(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),Ann();return e.captured??LOt}
export{LOt,CAr,F5r,X7r,gFn,hFn,yFn,Ann,lqe};
