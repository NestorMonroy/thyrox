// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{m}from"/$bunfs/root/chunk-7tpgnqqk.js";import{WE,Dut}from"/$bunfs/root/chunk-q7s9n316.js";import{IIt}from"/$bunfs/root/chunk-7cwp2m0j.js";import{s,se,c,C}from"/$bunfs/root/chunk-44xw78rx.js";var qSe="anthropic/devicePassthrough",n=["get_device_info","device_bash","list_devices","sync_files"],a="Claude_Browser__",r=128,_=1,i=m(()=>c({v:C(_),tool:s().min(1).max(r),target:se().optional()}));function Rut(t){let e=i().safeParse(t);if(!e.success)return;let o=Dut(e.data.target);return o===void 0?void 0:{v:e.data.v,tool:WE(e.data.tool,r),target:o}}var l=n.map(IIt),d=`${IIt(a)}_`;function p(t){let e=`${IIt(t)}_`;return l.some((o)=>e.startsWith(`${o}_`))}function u(t){let e=t.lastIndexOf("__"),o=e===-1?t:t.slice(e+2);return o.startsWith("computer_")||o==="device_request_folder_access"||o==="device_request_delete_permission"||`__${t}`.endsWith("__Claude_Browser__request_access")}function yKe(t){return!p(t)&&!`${IIt(t)}_`.startsWith(d)&&!u(t)}
export{qSe,Rut,yKe};
