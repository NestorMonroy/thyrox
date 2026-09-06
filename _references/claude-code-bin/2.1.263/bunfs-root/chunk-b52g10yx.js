// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{j,U}from"/$bunfs/root/chunk-k6vqz9fa.js";import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{h}from"/$bunfs/root/chunk-r1xh498w.js";import{Eo}from"/$bunfs/root/chunk-bnakj6gn.js";var hpt="in-process";class GVn{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var Ddr=new j(()=>new GVn);function t(){return Ddr.of(U().host)}function Ahr(e){t().setCliOverride(e)}function oun(){return t().cliOverride}function sun(e){t().replaceWith(e),n(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function iun(){return t().captured!==null}function vBt(){let e=t();if(e.cliOverride)e.capture(e.cliOverride),n(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Eo("teammateMode",hpt).value),n(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function A0e(){let e=t();if(e.captured===null)h(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),vBt();return e.captured??hpt}
export{hpt,GVn,Ddr,Ahr,oun,sun,iun,vBt,A0e};
