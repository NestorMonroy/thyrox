// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{w}from"/$bunfs/root/chunk-beptw75w.js";import{e}from"/$bunfs/root/chunk-9av83rwa.js";import{Ft,Ce,g,At,D}from"/$bunfs/root/chunk-mqace48v.js";import{Fs}from"/$bunfs/root/chunk-0ehjq4e3.js";D();function x(){let u=Fs(v);let V=new l;return u.subscribe(()=>{if(u.getState().voiceState!=="recording")V.reset()}),{store:u,levelSmoother:V}}var v={voiceState:"idle",voiceError:null,voiceInterimTranscript:"",voiceAudioLevels:[],voiceWarmingUp:!1,awaitingVoiceSubmitDoubleTap:!1};class l{#e=0;next(o,t){return this.#e=this.#e*t+o*(1-t),this.#e}reset(){this.#e=0}}var i=Ft(null);function KCn(o){let s=w(3),{children:t}=o,[n]=g(x),c;if(s[0]!==t||s[1]!==n)c=e(i.Provider,{value:n,children:t}),s[0]=t,s[1]=n,s[2]=c;else c=s[2];return c}function r(){let o=Ce(i);if(!o){throw Error("useVoiceState must be used within a VoiceProvider")}return o}function wMe(){return r().store}function ear(){return r().levelSmoother}function Vg(o){let n=w(3),t=wMe(),s;if(n[0]!==o||n[1]!==t)s=()=>o(t.getState()),n[0]=o,n[1]=t,n[2]=s;else s=n[2];let c=s;return At(t.subscribe,c,c)}function O5t(){return wMe().setState}function Wwe(){return wMe().getState}
export{KCn,wMe,ear,Vg,O5t,Wwe};
