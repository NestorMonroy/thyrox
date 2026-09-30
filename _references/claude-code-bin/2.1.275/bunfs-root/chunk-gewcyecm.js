// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{p}from"/$bunfs/root/chunk-dtjhjxgx.js";import{Rk,FPt}from"/$bunfs/root/chunk-8wzt1ksx.js";import{e5t}from"/$bunfs/root/chunk-kyk4e23z.js";import{o,ae,u,R}from"/$bunfs/root/chunk-nfxfp8ap.js";var JSe="anthropic/devicePassthrough",r=["get_device_info","device_bash","list_devices","sync_files"],_="Claude_Browser__",n=128,a=1,c=p(()=>u({v:R(a),tool:o().min(1).max(n),target:ae().optional()}));function zot(t){let e=c().safeParse(t);if(!e.success)return;let s=FPt(e.data.target);return s===void 0?void 0:{v:e.data.v,tool:Rk(e.data.tool,n),target:s}}var i=r.map(e5t),E=`${e5t(_)}_`;function l(t){let e=`${e5t(t)}_`;return i.some((s)=>e.startsWith(`${s}_`))}var d=new Set(["computer_request_access","computer_request_full_control","device_request_folder_access","device_request_delete_permission"]),O="device_bash";function f(t){let e=t.lastIndexOf("__"),s=e===-1?t:t.slice(e+2);return d.has(s)||t===O||`__${t}`.endsWith("__Claude_Browser__request_access")}function zGe(t){return!l(t)&&!`${e5t(t)}_`.startsWith(E)&&!f(t)}
export{JSe,zot,zGe};
