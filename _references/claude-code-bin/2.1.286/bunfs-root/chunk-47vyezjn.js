// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Ss}from"/$bunfs/root/chunk-4hjp8tw4.js";import{c}from"/$bunfs/root/chunk-dwaez71m.js";import{it}from"/$bunfs/root/chunk-4dvekan0.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";class f{latched=void 0;latch(e){this.latched=e}reset(){this.latched=void 0}}var d=it(new f,(e)=>e.reset());function Bx(){{if(d.latched!==void 0)return d.latched;let e=a.MCP_SDK_GENERATION,o=e==="v1"||e==="v2"?e:void 0;if(e!==void 0&&o===void 0)t(`MCP_SDK_GENERATION=${e} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,{level:"warn"});let n=o===void 0?Ss("tengu_brindle_causeway",!0):void 0,r=o??(n?.value===!1?"v1":"v2"),u=n===void 0?"env":n.source==="disabled"||n.source==="fallback"?"default":"growthbook";return d.latch(r),t(`mcp runtime arm: ${r} (source: ${u})`),i("tengu_mcp_sdk_generation",{generation:c(r),source:c(u)}),r}return"v1"}
export{Bx};
