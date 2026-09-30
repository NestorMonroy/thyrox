// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{e}from"/$bunfs/root/chunk-fr6qx5c3.js";import{zt,Ce,g,Mt,L}from"/$bunfs/root/chunk-68gegf2j.js";import{Ls}from"/$bunfs/root/chunk-v2jtzqr4.js";L();function x(){let u=Ls(v);let V=new l;return u.subscribe(()=>{if(u.getState().voiceState!=="recording")V.reset()}),{store:u,levelSmoother:V}}var v={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class l{#e=0;next(o,t){return this.#e=this.#e*t+o*(1-t),this.#e}reset(){this.#e=0}}var i=zt(null);function STn(o){let s=w(3),{children:t}=o,[n]=g(x),c;if(s[0]!==t||s[1]!==n)c=e(i.Provider,{value:n,children:t}),s[0]=t,s[1]=n,s[2]=c;else c=s[2];return c}function r(){let o=Ce(i);if(!o){throw Error("useVoiceState must be used within a VoiceProvider")}return o}function wOe(){return r().store}function tor(){return r().levelSmoother}function Pg(o){let n=w(3),t=wOe(),s;if(n[0]!==o||n[1]!==t)s=()=>o(t.getState()),n[0]=o,n[1]=t,n[2]=s;else s=n[2];let c=s;return Mt(t.subscribe,c,c)}function xKt(){return wOe().setState}function YSe(){return wOe().getState}
export{STn,wOe,tor,Pg,xKt,YSe};
