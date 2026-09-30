// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Sf,p2}from"/$bunfs/root/chunk-y8as26ve.js";import{Im}from"/$bunfs/root/chunk-1d5n9rp4.js";import{Bn}from"/$bunfs/root/chunk-ffayvr1z.js";import{loe}from"/$bunfs/root/chunk-qchwy6jm.js";import{tWt}from"/$bunfs/root/chunk-c55w8mev.js";class r{reader=void 0;register(e){this.reader=e}read(){return this.reader?.()??!1}}var o=new r;function z2n(e){o.register(e)}function Cve(){let e=p2("allow_plugin_skill_search");if(e==="org_denied"||e==="latched"||e==="unregistered"||e!==null&&Sf("hipaa"))return!1;if(loe())return!0;return Im()&&Bn()&&o.read()}function Noo(e){if(!tWt.includes(e))return!0;return Cve()}
export{z2n,Cve,Noo};
