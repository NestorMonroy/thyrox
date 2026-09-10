// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";import{Kt,Oe,d,Ct,L}from"/$bunfs/root/chunk-v21q572m.js";import{da}from"/$bunfs/root/chunk-xjq10gh9.js";L();function x(){let p=da(S);let m=new a;return p.subscribe(()=>{if(p.getState().voiceState!=="recording")m.reset()}),{store:p,levelSmoother:m}}var S={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class a{#e=0;next(t,o){return this.#e=this.#e*o+t*(1-o),this.#e}reset(){this.#e=0}}var n=Kt(null);function xLt(P){let R=y(3),{children:s}=P,[l]=d(x),V;if(R[0]!==s||R[1]!==l)V=e(n.Provider,{value:l,children:s}),R[0]=s,R[1]=l,R[2]=V;else V=R[2];return V}function i(){let b=Oe(n);if(!b){throw Error("useVoiceState must be used within a VoiceProvider")}return b}function Xce(){return i().store}function kon(){return i().levelSmoother}function rp(v){let C=y(3),c=Xce(),f;if(C[0]!==v||C[1]!==c)f=()=>v(c.getState()),C[0]=v,C[1]=c,C[2]=f;else f=C[2];let g=f;return Ct(c.subscribe,g,g)}function Nct(){return Xce().setState}function fte(){return Xce().getState}
export{xLt,Xce,kon,rp,Nct,fte};
