// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ns}from"/$bunfs/root/chunk-j7qjtsd3.js";import{Lt}from"/$bunfs/root/chunk-nvht7ckf.js";function p(){return Ns({value:"",active:!1,launchWarning:null,linkSuppliedTexts:new Set,submittedLinkPrefill:null,vimMode:"INSERT",stash:null})}var u=new Lt(()=>p());function dM(n){return u.of(n)}function Nnr(n){return dM(n).getState().value}function HPe(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.value!==""&&e===""){let r=t.value.trim(),o=t.launchWarning?.type==="deep-link"&&t.launchWarning.text===void 0?new Set(t.linkSuppliedTexts).add(r):t.linkSuppliedTexts;return{...t,value:e,launchWarning:null,linkSuppliedTexts:o,submittedLinkPrefill:o.has(r)?t.value:null}}return{...t,value:e}})}function $nr(n){return dM(n).getState().submittedLinkPrefill}function Fnr(n,e,t){dM(n).setState((r)=>{let o=t.trim();if(o===""||r.linkSuppliedTexts.has(o)||!r.linkSuppliedTexts.has(e.trim()))return r;return{...r,linkSuppliedTexts:new Set(r.linkSuppliedTexts).add(o)}})}function Unr(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function Iqt(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function ykn(n,e){Iqt(dM(n),e)}function Dbt(n,e){dM(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function Bnr(n,e){n.setState((t)=>{let r=e.type==="deep-link"?e.text?.trim():void 0,o=r===void 0||t.linkSuppliedTexts.has(r)?t.linkSuppliedTexts:new Set(t.linkSuppliedTexts).add(r),i=t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t.launchWarning:e;return i===t.launchWarning&&o===t.linkSuppliedTexts?t:{...t,launchWarning:i,linkSuppliedTexts:o}})}function jnr(n,e){Bnr(dM(n),e)}
export{dM,Nnr,HPe,$nr,Fnr,Unr,Iqt,ykn,Dbt,Bnr,jnr};
