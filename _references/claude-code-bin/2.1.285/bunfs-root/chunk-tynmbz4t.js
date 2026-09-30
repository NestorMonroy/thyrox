// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{xu,_dn}from"/$bunfs/root/chunk-hsxntwga.js";import{hj}from"/$bunfs/root/chunk-axx8rx4e.js";import{o,le,d,R}from"/$bunfs/root/chunk-ea52y7e7.js";var gse="anthropic/devicePassthrough",CVo=["get_device_info","device_bash","list_devices","sync_files"],r="Claude_Browser__",n=128,ZRn=1,_=p(()=>d({v:R(ZRn),tool:o().min(1).max(n),target:le().optional()}));function Xvt(t){let e=_().safeParse(t);if(!e.success)return;let s=_dn(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:xu(e.data.tool,n),target:s}}var a=CVo.map(hj),c=`${hj(r)}_`;function i(t){let e=`${hj(t)}_`;return a.some((s)=>e.startsWith(`${s}_`))}var E=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),l="device_bash";function exn(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return E.has(s)||t===l||`__${t}`.endsWith("__Claude_Browser__request_access")}function Hwe(t){return!i(t)&&!`${hj(t)}_`.startsWith(c)&&!exn(t)}
export{gse,CVo,ZRn,Xvt,exn,Hwe};
