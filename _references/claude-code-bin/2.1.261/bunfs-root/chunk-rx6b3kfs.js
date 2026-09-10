// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{b$,ZQ}from"/$bunfs/root/chunk-annedm50.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{b}from"/$bunfs/root/chunk-2y9gqtpa.js";import{kt,aG}from"/$bunfs/root/chunk-hyqdn9c0.js";import{h}from"/$bunfs/root/chunk-e1njvp95.js";import{jn,Ks}from"/$bunfs/root/chunk-hsewrfs2.js";import{Jt}from"/$bunfs/root/chunk-2e0agwm9.js";import{ft}from"/$bunfs/root/chunk-sh3w3snz.js";import{er}from"/$bunfs/root/chunk-hs05644q.js";import{OW,G0e,NW,EF,THe,yue}from"/$bunfs/root/chunk-vd630rs0.js";function Otn(t,n=!1){return`${THe(t)} Run /model fable${n?" in an interactive terminal session":""} to review and enable, then set it as the advisor.`}function nbe(t,n,a,l,s=!0,g=!1){let r=Ks(),e=t==="off"?void 0:er(t),f=e===void 0||G0e(e);if(i("tengu_advisor_command",{advisor:e===void 0?b("off"):f?kt(t):EF(e)?b("consent_pending"):b("invalid"),remote:r}),!r&&jn())return"The advisor can't be changed from this client \u2014 this connection is view-only or has no control channel";let m=r?" (this session only)":s?"":" for this session \u2014 run /advisor in the terminal to change your default";if(e===void 0){if(a((o)=>o.advisorModel===void 0?o:{...o,advisorModel:void 0}),r)jn()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:null}}).catch(h);else if(c(""),s)Jt("userSettings",{advisorModel:void 0},void 0,l);return`Advisor disabled${m}`}if(!f){if(EF(e))return Otn(e,g);let o=[...NW(),"off"].join(", ");return`${ft(aG(e))} cannot be used as an advisor. Valid options: ${o}`}if(a((o)=>o.advisorModel===e?o:{...o,advisorModel:e}),r)jn()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:e}}).catch(h);else if(c(e),s)Jt("userSettings",{advisorModel:e},void 0,l);let v=ft(aG(e)),u=ft(aG(n)),d=`Advisor set to ${v}${m}`;if(!OW(n))d+=`
Note: the current main model (${u}) does not support the advisor. It will activate when you switch to a supported main model.`;else if(!yue(n,e))d+=`
Note: ${v} is less capable than the current main model (${u}), so the advisor will not activate. Choose a more capable advisor, or switch to a smaller main model.`;return d}function c(t){ZQ({...b$()??{},advisorModel:t})}
export{Otn,nbe};
