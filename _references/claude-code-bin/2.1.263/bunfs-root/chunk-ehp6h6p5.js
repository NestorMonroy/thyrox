// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{b$,tZ}from"/$bunfs/root/chunk-k6vqz9fa.js";import{i}from"/$bunfs/root/chunk-y9tkdj4c.js";import{b}from"/$bunfs/root/chunk-1m0n2kwr.js";import{St,lG}from"/$bunfs/root/chunk-32f2qmtc.js";import{h}from"/$bunfs/root/chunk-r1xh498w.js";import{jn,Ks}from"/$bunfs/root/chunk-8bd42nrb.js";import{Jt}from"/$bunfs/root/chunk-xnx53tr1.js";import{ft}from"/$bunfs/root/chunk-te0qwtpy.js";import{er}from"/$bunfs/root/chunk-1wrntbps.js";import{NW,G0e,FW,AF,CHe,_ue}from"/$bunfs/root/chunk-9wa0ka8p.js";function Ntn(t,n=!1){return`${CHe(t)} Run /model fable${n?" in an interactive terminal session":""} to review and enable, then set it as the advisor.`}function rbe(t,n,a,l,s=!0,g=!1){let r=Ks(),e=t==="off"?void 0:er(t),f=e===void 0||G0e(e);if(i("tengu_advisor_command",{advisor:e===void 0?b("off"):f?St(t):AF(e)?b("consent_pending"):b("invalid"),remote:r}),!r&&jn())return"The advisor can't be changed from this client \u2014 this connection is view-only or has no control channel";let m=r?" (this session only)":s?"":" for this session \u2014 run /advisor in the terminal to change your default";if(e===void 0){if(a((o)=>o.advisorModel===void 0?o:{...o,advisorModel:void 0}),r)jn()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:null}}).catch(h);else if(c(""),s)Jt("userSettings",{advisorModel:void 0},void 0,l);return`Advisor disabled${m}`}if(!f){if(AF(e))return Ntn(e,g);let o=[...FW(),"off"].join(", ");return`${ft(lG(e))} cannot be used as an advisor. Valid options: ${o}`}if(a((o)=>o.advisorModel===e?o:{...o,advisorModel:e}),r)jn()?.sendControlRequest({subtype:"apply_flag_settings",settings:{advisorModel:e}}).catch(h);else if(c(e),s)Jt("userSettings",{advisorModel:e},void 0,l);let v=ft(lG(e)),u=ft(lG(n)),d=`Advisor set to ${v}${m}`;if(!NW(n))d+=`
Note: the current main model (${u}) does not support the advisor. It will activate when you switch to a supported main model.`;else if(!_ue(n,e))d+=`
Note: ${v} is less capable than the current main model (${u}), so the advisor will not activate. Choose a more capable advisor, or switch to a smaller main model.`;return d}function c(t){tZ({...b$()??{},advisorModel:t})}
export{Ntn,rbe};
