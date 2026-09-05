// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";import{hn,We,d,It,j}from"/$bunfs/root/chunk-db688wrz.js";import{Ja}from"/$bunfs/root/chunk-szt6v4n4.js";j();function x(){let p=Ja(S);let m=new a;return p.subscribe(()=>{if(p.getState().voiceState!=="recording")m.reset()}),{store:p,levelSmoother:m}}var S={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class a{#e=0;next(t,o){return this.#e=this.#e*o+t*(1-o),this.#e}reset(){this.#e=0}}var n=hn(null);function hPt(P){let R=y(3),{children:s}=P,[l]=d(x),V;if(R[0]!==s||R[1]!==l)V=e(n.Provider,{value:l,children:s}),R[0]=s,R[1]=l,R[2]=V;else V=R[2];return V}function i(){let b=We(n);if(!b){throw Error("useVoiceState must be used within a VoiceProvider")}return b}function ele(){return i().store}function OZt(){return i().levelSmoother}function Qd(v){let C=y(3),c=ele(),f;if(C[0]!==v||C[1]!==c)f=()=>v(c.getState()),C[0]=v,C[1]=c,C[2]=f;else f=C[2];let g=f;return It(c.subscribe,g,g)}function nst(){return ele().setState}function tee(){return ele().getState}
export{hPt,ele,OZt,Qd,nst,tee};
