// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{L}from"/$bunfs/root/chunk-v67w5hxq.js";function Aet(e){return typeof e==="number"&&Number.isInteger(e)&&e>0?e:void 0}function Zoo(e,d){let t=new Map,o=[];if(e===void 0||e===null)return{manifests:t,malformedField:!1,malformedServerNames:o};if(!L(e))return{manifests:t,malformedField:!0,malformedServerNames:o};for(let r of d){if(!Object.hasOwn(e,r))continue;let n=e[r],s=L(n)?n.initializeResult:void 0,i=L(n)&&n.toolsListResult!==null?n.toolsListResult:void 0;if(L(s)&&(i===void 0||L(i)))t.set(r,i===void 0?{initializeResult:s}:{initializeResult:s,toolsListResult:i});else o.push(r)}return{manifests:t,malformedField:!1,malformedServerNames:o}}var l="notifications/tools/list_changed";function Ret(e){return L(e)&&!("id"in e)&&e.method===l}var Cet=600000;
export{Aet,Cet,Zoo,Ret};
