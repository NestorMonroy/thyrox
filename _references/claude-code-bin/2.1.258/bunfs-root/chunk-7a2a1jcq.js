// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{h}from"/$bunfs/root/chunk-hfch6q45.js";import{ko}from"/$bunfs/root/chunk-dkdapnb4.js";var Jdt="in-process";class bVn{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var dyr=new Y(()=>new bVn);function o(){return dyr.of(W().host)}function MTr(e){o().setCliOverride(e)}function tcn(){return o().cliOverride}function ncn(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function rcn(){return o().captured!==null}function DFt(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(ko("teammateMode",Jdt).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function fDe(){let e=o();if(e.captured===null)h(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),DFt();return e.captured??Jdt}
export{Jdt,bVn,dyr,MTr,tcn,ncn,rcn,DFt,fDe};
