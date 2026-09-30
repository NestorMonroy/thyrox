// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{_}from"/$bunfs/root/chunk-zxcb8vnv.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{ixe}from"/$bunfs/root/chunk-97an4vx7.js";import{Gt}from"/$bunfs/root/chunk-x4dkmxcb.js";import{oe,g,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();function l(o,n,r){return o.isWindowActivation||c(n,r)}function Cg(){let o=Gt(),[n]=g(()=>o.now());return oe((r)=>{let e=o.now();if(!l(r,n,e))return!1;let u=r.isWindowActivation?_("window_activation"):_("mount_settle");return t(`Select: dropped stray click (${r.isWindowActivation?"window-activation click":`${e-n}ms after mount`})`),i("tengu_select_stray_click_dropped",{reason:u}),r.dropAsStray(),!0},[o,n])}function H9e(){let o=Gt(),[n]=g(()=>o.now());return oe(()=>c(n,o.now()),[o,n])}function c(o,n){return n-o<ixe}
export{Cg,H9e};
