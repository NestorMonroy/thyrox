// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{da}from"/$bunfs/root/chunk-xjq10gh9.js";import{Gt}from"/$bunfs/root/chunk-t8q7n4ta.js";function o(){return da({value:"",active:!1,launchWarning:null,vimMode:"INSERT",stash:null})}var r=new Gt(()=>o());function p$(n){return r.of(n)}function $4n(n){return p$(n).getState().value}function Cde(n,e){n.setState((t)=>{if(t.value===e)return t;if(t.launchWarning!==null&&t.value!==""&&e==="")return{...t,value:e,launchWarning:null};return{...t,value:e}})}function Wun(n,e){n.setState((t)=>t.stash===e?t:{...t,stash:e})}function Gmt(n,e){n.setState((t)=>t.active===e?t:{...t,active:e})}function QBt(n,e){Gmt(p$(n),e)}function b6e(n,e){p$(n).setState((t)=>t.vimMode===e?t:{...t,vimMode:e})}function Gun(n,e){n.setState((t)=>t.launchWarning?.type===e.type&&t.launchWarning.prefillLength===e.prefillLength?t:{...t,launchWarning:e})}function qun(n,e){Gun(p$(n),e)}
export{p$,$4n,Cde,Wun,Gmt,QBt,b6e,Gun,qun};
