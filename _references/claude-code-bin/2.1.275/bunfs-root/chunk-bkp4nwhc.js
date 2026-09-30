// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{qs}from"/$bunfs/root/chunk-kfdfjv5x.js";import{Nt}from"/$bunfs/root/chunk-4qqe0nh4.js";function p(){return qs({value:"",active:!1,launchWarning:null,linkSuppliedTexts:new Set,submittedLinkPrefill:null,vimMode:"INSERT",stash:null})}var u=new Nt(()=>p());function M$(n){return u.of(n)}function Awr(n){return M$(n).getState().value}function ISe(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.value!==""&&e===""){let r=t.value.trim(),o=t.launchWarning?.type==="deep-link"&&t.launchWarning.text===void 0?new Set(t.linkSuppliedTexts).add(r):t.linkSuppliedTexts;return{...t,value:e,launchWarning:null,linkSuppliedTexts:o,submittedLinkPrefill:o.has(r)?t.value:null}}return{...t,value:e}})}function lDn(n){return M$(n).getState().submittedLinkPrefill}function cDn(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function EIt(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function OQt(n,e){EIt(M$(n),e)}function Nrt(n,e){M$(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function uDn(n,e){n.setState((t)=>{let r=e.type==="deep-link"?e.text?.trim():void 0,o=r===void 0||t.linkSuppliedTexts.has(r)?t.linkSuppliedTexts:new Set(t.linkSuppliedTexts).add(r),i=t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t.launchWarning:e;return i===t.launchWarning&&o===t.linkSuppliedTexts?t:{...t,launchWarning:i,linkSuppliedTexts:o}})}function dDn(n,e){uDn(M$(n),e)}
export{M$,Awr,ISe,lDn,cDn,EIt,OQt,Nrt,uDn,dDn};
