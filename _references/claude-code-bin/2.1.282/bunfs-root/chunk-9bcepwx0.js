// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,W}from"/$bunfs/root/chunk-zwm3fybx.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{u}from"/$bunfs/root/chunk-xt60grfb.js";import{Ao}from"/$bunfs/root/chunk-8vkf59f8.js";var jon="in-process";class ewo{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var _Lo=new K(()=>new ewo);function o(){return _Lo.of(W().host)}function ljo(e){o().setCliOverride(e)}function nCr(){return o().cliOverride}function rCr(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function oCr(){return o().captured!==null}function PBn(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Ao("teammateMode",jon).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function Mit(){let e=o();if(e.captured===null)u(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),PBn();return e.captured??jon}
export{jon,ewo,_Lo,ljo,nCr,rCr,oCr,PBn,Mit};
