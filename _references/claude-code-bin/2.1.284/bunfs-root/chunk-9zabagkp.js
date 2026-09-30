// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{y}from"/$bunfs/root/chunk-czwr6846.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{vOe}from"/$bunfs/root/chunk-gdm53jqt.js";import{Xt}from"/$bunfs/root/chunk-3tevd7bg.js";import{ie,g,L}from"/$bunfs/root/chunk-68gegf2j.js";L();function l(o,n,r){return o.isWindowActivation||c(n,r)}function ih(){let o=Xt(),[n]=g(()=>o.now());return ie((r)=>{let e=o.now();if(!l(r,n,e))return!1;let u=r.isWindowActivation?y("window_activation"):y("mount_settle");return t(`Select: dropped stray click (${r.isWindowActivation?"window-activation click":`${e-n}ms after mount`})`),i("tengu_select_stray_click_dropped",{reason:u}),r.dropAsStray(),!0},[o,n])}function yQe(){let o=Xt(),[n]=g(()=>o.now());return ie(()=>c(n,o.now()),[o,n])}function c(o,n){return n-o<vOe}
export{ih,yQe};
