// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{_}from"/$bunfs/root/chunk-dwaez71m.js";import{l}from"/$bunfs/root/chunk-ctczby4m.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{la,Jx,wd,V8e,$Ue}from"/$bunfs/root/chunk-t9e08syq.js";import{mT}from"/$bunfs/root/chunk-b0e8a549.js";import{kb}from"/$bunfs/root/chunk-6meygax6.js";import{mz,yvr,ote}from"/$bunfs/root/chunk-kt4703ww.js";async function xOe(r,n,i){let o=Jx(r),{name:a,marketplace:e}=wd(o),m=mz(a,e,n),d=V8e(e);if(!d&&e!==la&&!$Ue(a,e))return m;let s=!1;try{s=await g(o,a,e,i)}catch(c){t(`Plugin telemetry: could not read the marketplace catalog to confirm "${r}" exists (${l(c)}); logging its name as third-party`)}return{...m,...d&&e!==void 0&&{marketplace_name_redacted:yvr(e)},...!s&&{plugin_name_redacted:_(kb)}}}async function g(r,n,i,o){if($Ue(n,i))return!0;if(i===la)return mT(n)!==void 0;return await ote(r,o)!==null}
export{xOe};
