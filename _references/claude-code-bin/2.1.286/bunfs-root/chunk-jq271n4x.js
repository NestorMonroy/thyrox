// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Fs}from"/$bunfs/root/chunk-0ehjq4e3.js";import{Tt}from"/$bunfs/root/chunk-hbjpbz2q.js";function p(){return Fs({value:"",active:!1,launchWarning:null,linkSuppliedTexts:new Set,submittedLinkPrefill:null,vimMode:"INSERT",stash:null})}var u=new Tt(()=>p());function FH(n){return u.of(n)}function pcr(n){return FH(n).getState().value}function qMe(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.value!==""&&e===""){let r=t.value.trim(),o=t.launchWarning?.type==="deep-link"&&t.launchWarning.text===void 0?new Set(t.linkSuppliedTexts).add(r):t.linkSuppliedTexts;return{...t,value:e,launchWarning:null,linkSuppliedTexts:o,submittedLinkPrefill:o.has(r)?t.value:null}}return{...t,value:e}})}function fcr(n){return FH(n).getState().submittedLinkPrefill}function mcr(n,e,t){FH(n).setState((r)=>{let o=t.trim();if(o===""||r.linkSuppliedTexts.has(o)||!r.linkSuppliedTexts.has(e.trim()))return r;return{...r,linkSuppliedTexts:new Set(r.linkSuppliedTexts).add(o)}})}function gcr(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function l6t(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function jxn(n,e){l6t(FH(n),e)}function UEt(n,e){FH(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function hcr(n,e){n.setState((t)=>{let r=e.type==="deep-link"?e.text?.trim():void 0,o=r===void 0||t.linkSuppliedTexts.has(r)?t.linkSuppliedTexts:new Set(t.linkSuppliedTexts).add(r),i=t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t.launchWarning:e;return i===t.launchWarning&&o===t.linkSuppliedTexts?t:{...t,launchWarning:i,linkSuppliedTexts:o}})}function ycr(n,e){hcr(FH(n),e)}
export{FH,pcr,qMe,fcr,mcr,gcr,l6t,jxn,UEt,hcr,ycr};
