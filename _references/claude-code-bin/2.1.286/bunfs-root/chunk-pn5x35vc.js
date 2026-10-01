// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{Hu,Jpn}from"/$bunfs/root/chunk-22qvrdjq.js";import{zj}from"/$bunfs/root/chunk-1b1zc2ez.js";import{o,ie,u,x}from"/$bunfs/root/chunk-cgbfr9c2.js";var Yse="anthropic/devicePassthrough",d3o=["get_device_info","device_bash","list_devices","sync_files"],r="Claude_Browser__",n=128,HPn=1,_=p(()=>u({v:x(HPn),tool:o().min(1).max(n),target:ie().optional()}));function Ykt(t){let e=_().safeParse(t);if(!e.success)return;let s=Jpn(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:Hu(e.data.tool,n),target:s}}var a=d3o.map(zj),c=`${zj(r)}_`;function i(t){let e=`${zj(t)}_`;return a.some((s)=>e.startsWith(`${s}_`))}var E=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),l="device_bash";function DPn(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return E.has(s)||t===l||`__${t}`.endsWith("__Claude_Browser__request_access")}function Ave(t){return!i(t)&&!`${zj(t)}_`.startsWith(c)&&!DPn(t)}
export{Yse,d3o,HPn,Ykt,DPn,Ave};
