// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,j}from"/$bunfs/root/chunk-nvht7ckf.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{Mo}from"/$bunfs/root/chunk-1kt44mj1.js";var fcn="in-process";class hIo{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var uzo=new q(()=>new hIo);function o(){return uzo.of(j().host)}function a5o(e){o().setCliOverride(e)}function pMr(){return o().cliOverride}function fMr(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function mMr(){return o().captured!==null}function Yzn(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Mo("teammateMode",fcn).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function xct(){let e=o();if(e.captured===null)d(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),Yzn();return e.captured??fcn}
export{fcn,hIo,uzo,a5o,pMr,fMr,mMr,Yzn,xct};
