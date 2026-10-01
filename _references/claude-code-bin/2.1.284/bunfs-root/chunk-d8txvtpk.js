// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{bt,vr}from"/$bunfs/root/chunk-gjfhbdvy.js";import{fo}from"/$bunfs/root/chunk-f481tw17.js";import{Ki,as}from"/$bunfs/root/chunk-dthsmpgp.js";import{wo}from"/$bunfs/root/chunk-77kn462z.js";import{Vr}from"/$bunfs/root/chunk-qepac0sq.js";import{T,g,L}from"/$bunfs/root/chunk-68gegf2j.js";L();function mpe(d,{selfOpened:t,onCancelled:f}){let[l,r]=g(!1),n=T(!1),[i,p]=g(!1),e=T(!1),h=vr(t?fo:null),u=!t||h,m=bt()?!0:!1,C=Ki(fo),{refusedWithin:S,noteRefused:b}=as();function R(){if(t&&(C()||S(fo)))return b(),!0;return!1}let c=Vr(()=>{if(e.current)return;let o=n.current;n.current=!0;let a=f(o);if(a===void 0){e.current=!0,wo(1);return}r(!0),s(a)},void 0,t&&!i);function E(){if(n.current||!u)return!1;return n.current=!0,r(!0),!0}function s(o){if(e.current)return;e.current=!0,p(!0),d(o)}return{choicesDisabled:!u&&!m,decided:l,take:E,refuseInput:R,settled:()=>e.current,handBack:s,exit:c,exitHintShowing:c.pending&&!i}}
export{mpe};
