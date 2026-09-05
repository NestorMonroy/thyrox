// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{j,U}from"/$bunfs/root/chunk-annedm50.js";import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{h}from"/$bunfs/root/chunk-e1njvp95.js";import{Eo}from"/$bunfs/root/chunk-0p1sxx9a.js";var gpt="in-process";class BVn{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var xdr=new j(()=>new BVn);function t(){return xdr.of(U().host)}function Hhr(e){t().setCliOverride(e)}function run(){return t().cliOverride}function oun(e){t().replaceWith(e),n(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function sun(){return t().captured!==null}function ABt(){let e=t();if(e.cliOverride)e.capture(e.cliOverride),n(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Eo("teammateMode",gpt).value),n(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function A0e(){let e=t();if(e.captured===null)h(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),ABt();return e.captured??gpt}
export{gpt,BVn,xdr,Hhr,run,oun,sun,ABt,A0e};
