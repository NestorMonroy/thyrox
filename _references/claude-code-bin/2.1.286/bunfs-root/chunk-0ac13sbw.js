// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{_}from"/$bunfs/root/chunk-dwaez71m.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{Jt}from"/$bunfs/root/chunk-fsx1dvsr.js";import{le,g,D}from"/$bunfs/root/chunk-mqace48v.js";import{EMe}from"/$bunfs/root/chunk-wepprdaf.js";D();function l(o,n,r){return o.isWindowActivation||c(n,r)}function fg(){let o=Jt(),[n]=g(()=>o.now());return le((r)=>{let e=o.now();if(!l(r,n,e))return!1;let u=r.isWindowActivation?_("window_activation"):_("mount_settle");return t(`Select: dropped stray click (${r.isWindowActivation?"window-activation click":`${e-n}ms after mount`})`),i("tengu_select_stray_click_dropped",{reason:u}),r.dropAsStray(),!0},[o,n])}function YZe(){let o=Jt(),[n]=g(()=>o.now());return le(()=>c(n,o.now()),[o,n])}function c(o,n){return n-o<EMe}
export{fg,YZe};
