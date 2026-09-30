// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Ys}from"/$bunfs/root/chunk-ydpmpkaw.js";import{Ut}from"/$bunfs/root/chunk-ja309z9r.js";function o(){return Ys({value:"",active:!1,launchWarning:null,vimMode:"INSERT",stash:null})}var r=new Ut(()=>o());function cU(n){return r.of(n)}function yhr(n){return cU(n).getState().value}function lbe(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.launchWarning!==null&&t.value!==""&&e==="")return{...t,value:e,launchWarning:null};return{...t,value:e}})}function APn(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function BCt(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function q9t(n,e){BCt(cU(n),e)}function Ctt(n,e){cU(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function TPn(n,e){n.setState((t)=>t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t:{...t,launchWarning:e})}function CPn(n,e){TPn(cU(n),e)}
export{cU,yhr,lbe,APn,BCt,q9t,Ctt,TPn,CPn};
