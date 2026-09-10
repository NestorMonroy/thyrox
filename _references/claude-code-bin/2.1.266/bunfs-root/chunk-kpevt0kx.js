// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{I}from"/$bunfs/root/chunk-btbsn9s4.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{u}from"/$bunfs/root/chunk-vkfaczp9.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{gl}from"/$bunfs/root/chunk-924sppga.js";class f{latched=void 0;latch(e){this.latched=e}reset(){this.latched=void 0}}var o=gl(new f,(e)=>e.reset());function sE(){{if(o.latched!==void 0)return o.latched;let e=a.MCP_SDK_GENERATION,n=e==="v1"||e==="v2"?e:void 0;if(e!==void 0&&n===void 0)t(`MCP_SDK_GENERATION=${e} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,{level:"warn"});let d=n===void 0&&I("tengu_brindle_causeway",!1)===!0,r=n??(d?"v2":"v1"),c=n!==void 0?"env":d?"growthbook":"default";return o.latch(r),t(`mcp runtime arm: ${r} (source: ${c})`),i("tengu_mcp_sdk_generation",{generation:u(r),source:u(c)}),r}return"v1"}
export{sE};
