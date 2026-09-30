// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Os}from"/$bunfs/root/chunk-39gr7gnw.js";import{Tt}from"/$bunfs/root/chunk-bxhyh54r.js";function p(){return Os({value:"",active:!1,launchWarning:null,linkSuppliedTexts:new Set,submittedLinkPrefill:null,vimMode:"INSERT",stash:null})}var u=new Tt(()=>p());function EM(n){return u.of(n)}function dir(n){return EM(n).getState().value}function FOe(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.value!==""&&e===""){let r=t.value.trim(),o=t.launchWarning?.type==="deep-link"&&t.launchWarning.text===void 0?new Set(t.linkSuppliedTexts).add(r):t.linkSuppliedTexts;return{...t,value:e,launchWarning:null,linkSuppliedTexts:o,submittedLinkPrefill:o.has(r)?t.value:null}}return{...t,value:e}})}function uir(n){return EM(n).getState().submittedLinkPrefill}function pir(n,e,t){EM(n).setState((r)=>{let o=t.trim();if(o===""||r.linkSuppliedTexts.has(o)||!r.linkSuppliedTexts.has(e.trim()))return r;return{...r,linkSuppliedTexts:new Set(r.linkSuppliedTexts).add(o)}})}function fir(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function G4t(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function uCn(n,e){G4t(EM(n),e)}function Uwt(n,e){EM(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function mir(n,e){n.setState((t)=>{let r=e.type==="deep-link"?e.text?.trim():void 0,o=r===void 0||t.linkSuppliedTexts.has(r)?t.linkSuppliedTexts:new Set(t.linkSuppliedTexts).add(r),i=t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t.launchWarning:e;return i===t.launchWarning&&o===t.linkSuppliedTexts?t:{...t,launchWarning:i,linkSuppliedTexts:o}})}function gir(n,e){mir(EM(n),e)}
export{EM,dir,FOe,uir,pir,fir,G4t,uCn,Uwt,mir,gir};
