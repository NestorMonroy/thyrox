// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{Xt,De,g,xt,D}from"/$bunfs/root/chunk-347kpssc.js";import{qs}from"/$bunfs/root/chunk-kfdfjv5x.js";D();function x(){let p=qs(S);let d=new a;return p.subscribe(()=>{if(p.getState().voiceState!=="recording")d.reset()}),{store:p,levelSmoother:d}}var S={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class a{#e=0;next(t,o){return this.#e=this.#e*o+t*(1-o),this.#e}reset(){this.#e=0}}var n=Xt(null);function _7t(P){let R=w(3),{children:s}=P,[l]=g(x),V;if(R[0]!==s||R[1]!==l)V=e(n.Provider,{value:l,children:s}),R[0]=s,R[1]=l,R[2]=V;else V=R[2];return V}function i(){let m=De(n);if(!m){throw Error("useVoiceState must be used within a VoiceProvider")}return m}function fSe(){return i().store}function q0n(){return i().levelSmoother}function Yf(v){let C=w(3),c=fSe(),b;if(C[0]!==v||C[1]!==c)b=()=>v(c.getState()),C[0]=v,C[1]=c,C[2]=b;else b=C[2];let f=b;return xt(c.subscribe,f,f)}function gxt(){return fSe().setState}function Eue(){return fSe().getState}
export{_7t,fSe,q0n,Yf,gxt,Eue};
