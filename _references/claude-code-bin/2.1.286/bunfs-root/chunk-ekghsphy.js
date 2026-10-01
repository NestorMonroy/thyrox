// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{yt,kr}from"/$bunfs/root/chunk-fsx1dvsr.js";import{ho}from"/$bunfs/root/chunk-h3czhx8x.js";import{T,g,D}from"/$bunfs/root/chunk-mqace48v.js";import{sa,ps}from"/$bunfs/root/chunk-s1j6ddnn.js";import{ts}from"/$bunfs/root/chunk-kt4703ww.js";import{To}from"/$bunfs/root/chunk-3cy27p45.js";D();function Zpe(d,{selfOpened:t,onCancelled:f}){let[l,r]=g(!1),n=T(!1),[i,p]=g(!1),e=T(!1),h=kr(t?ho:null),u=!t||h,m=yt()?!0:!1,C=sa(ho),{refusedWithin:S,noteRefused:b}=ps();function R(){if(t&&(C()||S(ho)))return b(),!0;return!1}let c=To(()=>{if(e.current)return;let o=n.current;n.current=!0;let a=f(o);if(a===void 0){e.current=!0,ts(1);return}r(!0),s(a)},void 0,t&&!i);function E(){if(n.current||!u)return!1;return n.current=!0,r(!0),!0}function s(o){if(e.current)return;e.current=!0,p(!0),d(o)}return{choicesDisabled:!u&&!m,decided:l,take:E,refuseInput:R,settled:()=>e.current,handBack:s,exit:c,exitHintShowing:c.pending&&!i}}
export{Zpe};
