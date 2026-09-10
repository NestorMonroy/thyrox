// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{m}from"/$bunfs/root/chunk-55w4bsdv.js";import{$E,est}from"/$bunfs/root/chunk-94d1zdqx.js";import{dn}from"/$bunfs/root/chunk-dj36f346.js";import{i,de,c,I}from"/$bunfs/root/chunk-84vc68b7.js";var a_e="anthropic/devicePassthrough",n=["get_device_info","device_bash","list_devices","sync_files"],a="Claude_Browser__",s=128,_=1,l=m(()=>c({v:I(_),tool:i().min(1).max(s),target:de().optional()}));function zit(t){let e=l().safeParse(t);if(!e.success)return;let o=est(e.data.target);return o===void 0?void 0:{v:e.data.v,tool:$E(e.data.tool,s),target:o}}function r(t){return dn(t).toLowerCase().replace(/[-_]+/g,"_").replace(/^_|_$/g,"")}var p=n.map(r),u=`${r(a)}_`;function d(t){let e=`${r(t)}_`;return p.some((o)=>e.startsWith(`${o}_`))}function E(t){let e=t.lastIndexOf("__"),o=e===-1?t:t.slice(e+2);return o.startsWith("computer_")||o==="device_request_folder_access"||o==="device_request_delete_permission"||`__${t}`.endsWith("__Claude_Browser__request_access")}function Vit(t){return!d(t)&&!`${r(t)}_`.startsWith(u)&&!E(t)}
export{a_e,zit,Vit};
