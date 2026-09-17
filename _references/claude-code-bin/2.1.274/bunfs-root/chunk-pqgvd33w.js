// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";import{Kt,Me,m,Ot,L}from"/$bunfs/root/chunk-s59wj17y.js";import{Ys}from"/$bunfs/root/chunk-ydpmpkaw.js";L();function h(){let p=Ys(V);let b=new a;return p.subscribe(()=>{if(p.getState().voiceState!=="recording")b.reset()}),{store:p,levelSmoother:b}}var V={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class a{#e=0;next(t,o){return this.#e=this.#e*o+t*(1-o),this.#e}reset(){this.#e=0}}var n=Kt(null);function qYt(P){let R=S(3),{children:s}=P,[l]=m(h),d;if(R[0]!==s||R[1]!==l)d=e(n.Provider,{value:l,children:s}),R[0]=s,R[1]=l,R[2]=d;else d=R[2];return d}function i(){let f=Me(n);if(!f){throw Error("useVoiceState must be used within a VoiceProvider")}return f}function V_e(){return i().store}function Hxn(){return i().levelSmoother}function jf(v){let C=S(3),c=V_e(),g;if(C[0]!==v||C[1]!==c)g=()=>v(c.getState()),C[0]=v,C[1]=c,C[2]=g;else g=C[2];let x=g;return Ot(c.subscribe,x,x)}function DTt(){return V_e().setState}function yce(){return V_e().getState}
export{qYt,V_e,Hxn,jf,DTt,yce};
