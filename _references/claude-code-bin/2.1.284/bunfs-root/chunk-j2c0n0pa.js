// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{Pu,sun}from"/$bunfs/root/chunk-q3brtb9y.js";import{vj}from"/$bunfs/root/chunk-0pbw9fcy.js";import{o,le,u,R}from"/$bunfs/root/chunk-fwjxbyrt.js";var gse="anthropic/devicePassthrough",gVo=["get_device_info","device_bash","list_devices","sync_files"],r="Claude_Browser__",n=128,JRn=1,_=f(()=>u({v:R(JRn),tool:o().min(1).max(n),target:le().optional()}));function Vvt(t){let e=_().safeParse(t);if(!e.success)return;let s=sun(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:Pu(e.data.tool,n),target:s}}var a=gVo.map(vj),c=`${vj(r)}_`;function i(t){let e=`${vj(t)}_`;return a.some((s)=>e.startsWith(`${s}_`))}var E=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),l="device_bash";function QRn(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return E.has(s)||t===l||`__${t}`.endsWith("__Claude_Browser__request_access")}function Mwe(t){return!i(t)&&!`${vj(t)}_`.startsWith(c)&&!QRn(t)}
export{gse,gVo,JRn,Vvt,QRn,Mwe};
