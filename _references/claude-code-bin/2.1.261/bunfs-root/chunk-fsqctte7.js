// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Ya}from"/$bunfs/root/chunk-9j72twq2.js";import{zt}from"/$bunfs/root/chunk-annedm50.js";function o(){return Ya({value:"",active:!1,launchWarning:null,vimMode:"INSERT",stash:null})}var r=new zt(()=>o());function cM(n){return r.of(n)}function wVn(n){return cM(n).getState().value}function Yce(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.launchWarning!==null&&t.value!==""&&e==="")return{...t,value:e,launchWarning:null};return{...t,value:e}})}function kln(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function Yft(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function NFt(n,e){Yft(cM(n),e)}function k4e(n,e){cM(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function Tln(n,e){n.setState((t)=>t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t:{...t,launchWarning:e})}function Cln(n,e){Tln(cM(n),e)}
export{cM,wVn,Yce,kln,Yft,NFt,k4e,Tln,Cln};
