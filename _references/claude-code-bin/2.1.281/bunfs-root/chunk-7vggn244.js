// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{b}from"/$bunfs/root/chunk-rnxz8hs2.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{MCe}from"/$bunfs/root/chunk-06k5ykny.js";import{Bt}from"/$bunfs/root/chunk-yn4wjwza.js";import{oe,g,D}from"/$bunfs/root/chunk-av0brfrs.js";D();function l(o,n,r){return o.isWindowActivation||c(n,r)}function Gg(){let o=Bt(),[n]=g(()=>o.now());return oe((r)=>{let e=o.now();if(!l(r,n,e))return!1;let u=r.isWindowActivation?b("window_activation"):b("mount_settle");return t(`Select: dropped stray click (${r.isWindowActivation?"window-activation click":`${e-n}ms after mount`})`),i("tengu_select_stray_click_dropped",{reason:u}),r.dropAsStray(),!0},[o,n])}function e8e(){let o=Bt(),[n]=g(()=>o.now());return oe(()=>c(n,o.now()),[o,n])}function c(o,n){return n-o<MCe}
export{Gg,e8e};
