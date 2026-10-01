// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{V,j}from"/$bunfs/root/chunk-hbjpbz2q.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{d}from"/$bunfs/root/chunk-hqt9kt0y.js";import{Fo}from"/$bunfs/root/chunk-p4fvnznr.js";var Yfn="in-process";class C$o{captured=null;cliOverride=null;setCliOverride(e){this.cliOverride=e}capture(e){this.captured=e}replaceWith(e){this.captured=e,this.cliOverride=null}}var e8o=new V(()=>new C$o);function o(){return e8o.of(j().host)}function res(e){o().setCliOverride(e)}function OUr(){return o().cliOverride}function MUr(e){o().replaceWith(e),t(`[TeammateModeSnapshot] CLI override cleared, new mode: ${e}`)}function HUr(){return o().captured!==null}function Q5n(){let e=o();if(e.cliOverride)e.capture(e.cliOverride),t(`[TeammateModeSnapshot] Captured from CLI override: ${e.captured}`);else e.capture(Fo("teammateMode",Yfn).value),t(`[TeammateModeSnapshot] Captured from config: ${e.captured}`)}function nft(){let e=o();if(e.captured===null)d(Error("getTeammateModeFromSnapshot called before capture - this indicates an initialization bug")),Q5n();return e.captured??Yfn}
export{Yfn,C$o,e8o,res,OUr,MUr,HUr,Q5n,nft};
