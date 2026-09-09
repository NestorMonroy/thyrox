// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{CL,kee}from"/$bunfs/root/chunk-t8q7n4ta.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{_}from"/$bunfs/root/chunk-vkfaczp9.js";import{bt,bW}from"/$bunfs/root/chunk-btbsn9s4.js";import{h}from"/$bunfs/root/chunk-jvycdhmw.js";import{zn,Qs}from"/$bunfs/root/chunk-zw6xpj0e.js";import{Qt}from"/$bunfs/root/chunk-kcxa79n8.js";import{ft}from"/$bunfs/root/chunk-knsrg480.js";import{Zn}from"/$bunfs/root/chunk-5jacf3nm.js";import{tV,dLe,nV,HU,uEe,spe}from"/$bunfs/root/chunk-yw4jc948.js";function msn(t,n=!1){return`${uEe(t)} Run /model fable${n?" in an interactive terminal session":""} to review and enable, then set it as the advisor.`}function zSe(t,n,a,l,s=!0,g=!1){let r=Qs(),e=t==="off"?void 0:Zn(t),f=e===void 0||dLe(e);if(i("tengu_advisor_command",{advisor:e===void 0?_("off"):f?bt(t):HU(e)?_("consent_pending"):_("invalid"),remote:r}),!r&&zn())return"The advisor can't be changed from this client \u2014 this connection is view-only or has no control channel";let m=r?" (this session only)":s?"":" for this session \u2014 run /advisor in the terminal to change your default";if(e===void 0){if(a((o)=>o.advisorModel===void 0?o:{...o,advisorModel:void 0}),r)zn()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:null}}).catch(h);else if(c(""),s)Qt("userSettings",{advisorModel:void 0},void 0,l);return`Advisor disabled${m}`}if(!f){if(HU(e))return msn(e,g);let o=[...nV(),"off"].join(", ");return`${ft(bW(e))} cannot be used as an advisor. Valid options: ${o}`}if(a((o)=>o.advisorModel===e?o:{...o,advisorModel:e}),r)zn()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:e}}).catch(h);else if(c(e),s)Qt("userSettings",{advisorModel:e},void 0,l);let v=ft(bW(e)),u=ft(bW(n)),d=`Advisor set to ${v}${m}`;if(!tV(n))d+=`
Note: the current main model (${u}) does not support the advisor. It will activate when you switch to a supported main model.`;else if(!spe(n,e))d+=`
Note: ${v} is less capable than the current main model (${u}), so the advisor will not activate. Choose a more capable advisor, or switch to a smaller main model.`;return d}function c(t){kee({...CL()??{},advisorModel:t})}
export{msn,zSe};
