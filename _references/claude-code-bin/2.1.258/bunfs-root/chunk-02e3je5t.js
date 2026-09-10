// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{L}from"/$bunfs/root/chunk-8qt7d28b.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{u}from"/$bunfs/root/chunk-mrh5xd2h.js";import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{vI}from"/$bunfs/root/chunk-8p7g3f8s.js";class c{latched=void 0;latch(e){this.latched=e}reset(){this.latched=void 0}}var o=vI(new c,(e)=>e.reset());function Bw(){{if(o.latched!==void 0)return o.latched;let e=a.MCP_SDK_GENERATION,n=e==="v1"||e==="v2"?e:void 0;if(e!==void 0&&n===void 0)t(`MCP_SDK_GENERATION=${e} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,{level:"warn"});let i=n===void 0&&L("tengu_brindle_causeway",!1)===!0,r=n??(i?"v2":"v1"),d=n!==void 0?"env":i?"growthbook":"default";return o.latch(r),t(`mcp runtime arm: ${r} (source: ${d})`),s("tengu_mcp_sdk_generation",{generation:u(r),source:u(d)}),r}return"v1"}
export{Bw};
