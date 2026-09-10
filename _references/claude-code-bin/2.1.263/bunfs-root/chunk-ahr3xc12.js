// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Ya}from"/$bunfs/root/chunk-a4fh8a2g.js";import{zt}from"/$bunfs/root/chunk-k6vqz9fa.js";function o(){return Ya({value:"",active:!1,launchWarning:null,vimMode:"INSERT",stash:null})}var r=new zt(()=>o());function cM(n){return r.of(n)}function vVn(n){return cM(n).getState().value}function Xce(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.launchWarning!==null&&t.value!==""&&e==="")return{...t,value:e,launchWarning:null};return{...t,value:e}})}function Tln(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function Xft(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function FFt(n,e){Xft(cM(n),e)}function C4e(n,e){cM(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function Cln(n,e){n.setState((t)=>t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t:{...t,launchWarning:e})}function Rln(n,e){Cln(cM(n),e)}
export{cM,vVn,Xce,Tln,Xft,FFt,C4e,Cln,Rln};
