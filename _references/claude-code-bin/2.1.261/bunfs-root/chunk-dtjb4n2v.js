// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{I}from"/$bunfs/root/chunk-hyqdn9c0.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{u}from"/$bunfs/root/chunk-2y9gqtpa.js";import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{od}from"/$bunfs/root/chunk-h3jmzymx.js";class f{latched=void 0;latch(e){this.latched=e}reset(){this.latched=void 0}}var o=od(new f,(e)=>e.reset());function Cw(){{if(o.latched!==void 0)return o.latched;let e=a.MCP_SDK_GENERATION,t=e==="v1"||e==="v2"?e:void 0;if(e!==void 0&&t===void 0)n(`MCP_SDK_GENERATION=${e} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,{level:"warn"});let d=t===void 0&&I("tengu_brindle_causeway",!1)===!0,r=t??(d?"v2":"v1"),c=t!==void 0?"env":d?"growthbook":"default";return o.latch(r),n(`mcp runtime arm: ${r} (source: ${c})`),i("tengu_mcp_sdk_generation",{generation:u(r),source:u(c)}),r}return"v1"}
export{Cw};
