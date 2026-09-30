// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Is}from"/$bunfs/root/chunk-k0p66s5d.js";import{Mt}from"/$bunfs/root/chunk-zwm3fybx.js";function p(){return Is({value:"",active:!1,launchWarning:null,linkSuppliedTexts:new Set,submittedLinkPrefill:null,vimMode:"INSERT",stash:null})}var u=new Mt(()=>p());function _O(n){return u.of(n)}function p7n(n){return _O(n).getState().value}function mxe(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.value!==""&&e===""){let r=t.value.trim(),o=t.launchWarning?.type==="deep-link"&&t.launchWarning.text===void 0?new Set(t.linkSuppliedTexts).add(r):t.linkSuppliedTexts;return{...t,value:e,launchWarning:null,linkSuppliedTexts:o,submittedLinkPrefill:o.has(r)?t.value:null}}return{...t,value:e}})}function f7n(n){return _O(n).getState().submittedLinkPrefill}function m7n(n,e,t){_O(n).setState((r)=>{let o=t.trim();if(o===""||r.linkSuppliedTexts.has(o)||!r.linkSuppliedTexts.has(e.trim()))return r;return{...r,linkSuppliedTexts:new Set(r.linkSuppliedTexts).add(o)}})}function g7n(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function Xzt(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function Lbn(n,e){Xzt(_O(n),e)}function Nht(n,e){_O(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function h7n(n,e){n.setState((t)=>{let r=e.type==="deep-link"?e.text?.trim():void 0,o=r===void 0||t.linkSuppliedTexts.has(r)?t.linkSuppliedTexts:new Set(t.linkSuppliedTexts).add(r),i=t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t.launchWarning:e;return i===t.launchWarning&&o===t.linkSuppliedTexts?t:{...t,launchWarning:i,linkSuppliedTexts:o}})}function y7n(n,e){h7n(_O(n),e)}
export{_O,p7n,mxe,f7n,m7n,g7n,Xzt,Lbn,Nht,h7n,y7n};
