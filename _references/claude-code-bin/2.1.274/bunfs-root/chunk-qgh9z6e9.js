// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{IP,bq}from"/$bunfs/root/chunk-ja309z9r.js";import{b}from"/$bunfs/root/chunk-64dkx51v.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{vt,T4}from"/$bunfs/root/chunk-27bj2wbx.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{or,Wi}from"/$bunfs/root/chunk-pc40tvt4.js";import{Zt}from"/$bunfs/root/chunk-m0am9fba.js";import{yt}from"/$bunfs/root/chunk-qk2a968b.js";import{Kn}from"/$bunfs/root/chunk-zsdbd62x.js";import{I5,vVe,P5,kz,jOe,sve}from"/$bunfs/root/chunk-ayyj05ne.js";function DHn(t,n=!1){return`${jOe(t)} Run /model fable${n?" in an interactive terminal session":""} to review and enable, then set it as the advisor.`}function $Pe(t,n,l,f,s=!0,p=!1){let r=Wi(),e=t==="off"?void 0:Kn(t),m=e===void 0||vVe(e);if(i("tengu_advisor_command",{advisor:e===void 0?b("off"):m?vt(t):kz(e)?b("consent_pending"):b("invalid"),remote:r}),!r&&or())return"The advisor can't be changed from this client \u2014 this connection is view-only or has no control channel";let v=r?" (this session only)":s?"":" for this session \u2014 run /advisor in the terminal to change your default";if(e===void 0){if(l((o)=>o.advisorModel===void 0?o:{...o,advisorModel:void 0}),r)or()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:null}}).catch(d);else if(g(""),s)Zt("userSettings",{advisorModel:void 0},void 0,f);return`Advisor disabled${v}`}if(!m){if(kz(e))return DHn(e,p);let o=[...P5(),"off"].join(", ");return`${yt(T4(e))} cannot be used as an advisor. Valid options: ${o}`}if(l((o)=>o.advisorModel===e?o:{...o,advisorModel:e}),r)or()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:e}}).catch(d);else if(g(e),s)Zt("userSettings",{advisorModel:e},void 0,f);let u=yt(T4(e)),c=yt(T4(n)),a=`Advisor set to ${u}${v}`;if(!I5(n))a+=`
Note: the current main model (${c}) does not support the advisor. It will activate when you switch to a supported main model.`;else if(!sve(n,e))a+=`
Note: ${u} is less capable than the current main model (${c}), so the advisor will not activate. Choose a more capable advisor, or switch to a smaller main model.`;return a}function g(t){bq({...IP()??{},advisorModel:t})}
export{DHn,$Pe};
