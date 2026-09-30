// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{_}from"/$bunfs/root/chunk-aap6zsd0.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{i}from"/$bunfs/root/chunk-gn6mgw10.js";import{Zt}from"/$bunfs/root/chunk-k0qnyh4a.js";import{ie,g,D}from"/$bunfs/root/chunk-bqbammwz.js";import{gOe}from"/$bunfs/root/chunk-bj1nat4s.js";D();function l(o,n,r){return o.isWindowActivation||c(n,r)}function th(){let o=Zt(),[n]=g(()=>o.now());return ie((r)=>{let e=o.now();if(!l(r,n,e))return!1;let u=r.isWindowActivation?_("window_activation"):_("mount_settle");return t(`Select: dropped stray click (${r.isWindowActivation?"window-activation click":`${e-n}ms after mount`})`),i("tengu_select_stray_click_dropped",{reason:u}),r.dropAsStray(),!0},[o,n])}function _Qe(){let o=Zt(),[n]=g(()=>o.now());return ie(()=>c(n,o.now()),[o,n])}function c(o,n){return n-o<gOe}
export{th,_Qe};
