// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{f}from"/$bunfs/root/chunk-w8gsn0hm.js";import{QE,QRt}from"/$bunfs/root/chunk-f8j1ssy3.js";import{HKt}from"/$bunfs/root/chunk-268fnj1t.js";import{o,ae,u,R}from"/$bunfs/root/chunk-13s0tpz6.js";var Cbe="anthropic/devicePassthrough",r=["get_device_info","device_bash","list_devices","sync_files"],_="Claude_Browser__",n=128,a=1,c=f(()=>u({v:R(a),tool:o().min(1).max(n),target:ae().optional()}));function Fnt(t){let e=c().safeParse(t);if(!e.success)return;let s=QRt(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:QE(e.data.tool,n),target:s}}var i=r.map(HKt),E=`${HKt(_)}_`;function l(t){let e=`${HKt(t)}_`;return i.some((s)=>e.startsWith(`${s}_`))}var d=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),p="device_bash";function O(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return d.has(s)||t===p||`__${t}`.endsWith("__Claude_Browser__request_access")}function Gze(t){return!l(t)&&!`${HKt(t)}_`.startsWith(E)&&!O(t)}
export{Cbe,Fnt,Gze};
