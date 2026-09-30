// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{V,W}from"/$bunfs/root/chunk-cqc88nqm.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{u}from"/$bunfs/root/chunk-0n80jtth.js";import{yo}from"/$bunfs/root/chunk-fxt3hn7r.js";var i4t="in-process";class K8r{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var Qxo=new V(()=>new K8r);function o(){return Qxo.of(W().host)}function ELo(e){o().setCliOverride(e)}function Xrr(){return o().cliOverride}function Jrr(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function Qrr(){return o().captured!==null}function kkn(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(yo("teammateMode",i4t).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function GJe(){let e=o();if(e.captured===null)u(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),kkn();return e.captured??i4t}
export{i4t,K8r,Qxo,ELo,Xrr,Jrr,Qrr,kkn,GJe};
