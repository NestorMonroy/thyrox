// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{h}from"/$bunfs/root/chunk-jvycdhmw.js";import{Eo}from"/$bunfs/root/chunk-y1gw8jjw.js";var dkt="in-process";class Cor{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var h_r=new z(()=>new Cor);function o(){return h_r.of(B().host)}function dEr(e){o().setCliOverride(e)}function rAn(){return o().cliOverride}function oAn(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function sAn(){return o().captured!==null}function J3t(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Eo("teammateMode",dkt).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function jUe(){let e=o();if(e.captured===null)h(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),J3t();return e.captured??dkt}
export{dkt,Cor,h_r,dEr,rAn,oAn,sAn,J3t,jUe};
