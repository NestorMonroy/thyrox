// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{oy,krn}from"/$bunfs/root/chunk-5t3x93y6.js";import{J1}from"/$bunfs/root/chunk-831var66.js";import{o,ae,u,R}from"/$bunfs/root/chunk-dk5kbfrn.js";var Soe="anthropic/devicePassthrough",pjo=["get_device_info","device_bash","list_devices","sync_files"],r="Claude_Browser__",n=128,MTn=1,_=f(()=>u({v:R(MTn),tool:o().min(1).max(n),target:ae().optional()}));function NSt(t){let e=_().safeParse(t);if(!e.success)return;let s=krn(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:oy(e.data.tool,n),target:s}}var a=pjo.map(J1),c=`${J1(r)}_`;function i(t){let e=`${J1(t)}_`;return a.some((s)=>e.startsWith(`${s}_`))}var E=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),l="device_bash";function DTn(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return E.has(s)||t===l||`__${t}`.endsWith("__Claude_Browser__request_access")}function kSe(t){return!i(t)&&!`${J1(t)}_`.startsWith(c)&&!DTn(t)}
export{Soe,pjo,MTn,NSt,DTn,kSe};
