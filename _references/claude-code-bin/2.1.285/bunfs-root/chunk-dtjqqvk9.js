// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{St,Er}from"/$bunfs/root/chunk-k0qnyh4a.js";import{yo}from"/$bunfs/root/chunk-gjsn55pt.js";import{k,g,D}from"/$bunfs/root/chunk-bqbammwz.js";import{Xi,ds}from"/$bunfs/root/chunk-g515ga2v.js";import{Yo}from"/$bunfs/root/chunk-qazw855w.js";import{mo}from"/$bunfs/root/chunk-t1tzx34d.js";D();function mpe(d,{selfOpened:t,onCancelled:f}){let[l,r]=g(!1),n=k(!1),[i,p]=g(!1),e=k(!1),h=Er(t?yo:null),u=!t||h,m=St()?!0:!1,C=Xi(yo),{refusedWithin:S,noteRefused:b}=ds();function R(){if(t&&(C()||S(yo)))return b(),!0;return!1}let c=mo(()=>{if(e.current)return;let o=n.current;n.current=!0;let a=f(o);if(a===void 0){e.current=!0,Yo(1);return}r(!0),s(a)},void 0,t&&!i);function E(){if(n.current||!u)return!1;return n.current=!0,r(!0),!0}function s(o){if(e.current)return;e.current=!0,p(!0),d(o)}return{choicesDisabled:!u&&!m,decided:l,take:E,refuseInput:R,settled:()=>e.current,handBack:s,exit:c,exitHintShowing:c.pending&&!i}}
export{mpe};
