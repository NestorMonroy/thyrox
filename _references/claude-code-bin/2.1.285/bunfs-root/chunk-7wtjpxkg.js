// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{e}from"/$bunfs/root/chunk-ne6sbmea.js";import{Ft,Re,g,D}from"/$bunfs/root/chunk-bqbammwz.js";D();var y=10,a={ring:[],mode:{type:"idle"}};function h(n,i){switch(i.type){case"kill":{if(i.text.length===0)return n.mode.type==="idle"?n:{...n,mode:{type:"idle"}};return{ring:n.mode.type==="killing"&&n.ring.length>0?[i.direction==="prepend"?i.text+n.ring[0]:n.ring[0]+i.text,...n.ring.slice(1)]:[i.text,...n.ring].slice(0,y),mode:{type:"killing"}}}case"yank":return{...n,mode:{type:"yanked",start:i.start,length:i.length,index:0}};case"yankPop":{if(n.mode.type!=="yanked"||n.ring.length<=1)return n;let r=(n.mode.index+1)%n.ring.length;return{...n,mode:{...n.mode,index:r}}}case"updateYankLength":if(n.mode.type!=="yanked")return n;return{...n,mode:{...n.mode,length:i.length}};case"interrupt":if(n.mode.type==="idle")return n;return{...n,mode:{type:"idle"}}}}function TKt(n){return n.ring[0]??""}function AKt(n){if(n.mode.type!=="yanked"||n.ring.length<=1)return null;let i=(n.mode.index+1)%n.ring.length,{start:r,length:t}=n.mode;return{text:n.ring[i]??"",start:r,length:t}}function ATn(){let n=a;return{get state(){return n},dispatch(i){n=h(n,i)}}}var l=Ft(null);function TQe(n){let t=w(5),{handle:i,children:r}=n,u;if(t[0]!==i)u=()=>i??ATn(),t[0]=i,t[1]=u;else u=t[1];let[x]=g(u);const d=i??x;let c;if(t[2]!==r||t[3]!==d)c=e(l.Provider,{value:d,children:r}),t[2]=r,t[3]=d,t[4]=c;else c=t[4];return c}function fSt(){let n=Re(l);if(!n){throw ReferenceError("useKillRing cannot be called outside of a <KillRingProvider /> (mounted around every Ink root by src/ink.ts)")}return n}
export{TKt,AKt,ATn,TQe,fSt};
