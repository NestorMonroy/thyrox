// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,j}from"/$bunfs/root/chunk-bxhyh54r.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{Mo}from"/$bunfs/root/chunk-awbn58vk.js";var gun="in-process";class qMo{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var y4o=new q(()=>new qMo);function o(){return y4o.of(j().host)}function wXo(e){o().setCliOverride(e)}function dNr(){return o().cliOverride}function uNr(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function pNr(){return o().captured!==null}function Kqn(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Mo("teammateMode",gun).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function dut(){let e=o();if(e.captured===null)u(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),Kqn();return e.captured??gun}
export{gun,qMo,y4o,wXo,dNr,uNr,pNr,Kqn,dut};
