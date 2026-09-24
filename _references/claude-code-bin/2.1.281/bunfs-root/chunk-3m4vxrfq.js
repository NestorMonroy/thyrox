// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{$t,kr}from"/$bunfs/root/chunk-b8sc2vbx.js";import{wo}from"/$bunfs/root/chunk-55xzr21a.js";import{Zi,ls}from"/$bunfs/root/chunk-gwmysnkk.js";import{fo}from"/$bunfs/root/chunk-4n4g22z6.js";import{Fr}from"/$bunfs/root/chunk-hkzf5rvk.js";import{T,g,D}from"/$bunfs/root/chunk-av0brfrs.js";D();function uBt(d,{selfOpened:t,onCancelled:f}){let[l,r]=g(!1),n=T(!1),[i,p]=g(!1),e=T(!1),h=kr(t?wo:null),u=!t||h,m=$t()?!0:!1,C=Zi(wo),{refusedWithin:S,noteRefused:b}=ls();function R(){if(t&&(C()||S(wo)))return b(),!0;return!1}let c=Fr(()=>{if(e.current)return;let o=n.current;n.current=!0;let a=f(o);if(a===void 0){e.current=!0,fo(1);return}r(!0),s(a)},void 0,t&&!i);function E(){if(n.current||!u)return!1;return n.current=!0,r(!0),!0}function s(o){if(e.current)return;e.current=!0,p(!0),d(o)}return{choicesDisabled:!u&&!m,decided:l,take:E,refuseInput:R,settled:()=>e.current,handBack:s,exit:c,exitHintShowing:c.pending&&!i}}
export{uBt};
