// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{K}from"/$bunfs/root/chunk-b93xrf5w.js";function B8e(e){return typeof e==="number"&&Number.isInteger(e)&&e>0?e:void 0}function Szr(e,d){let t=new Map,o=[];if(e===void 0||e===null)return{manifests:t,malformedField:!1,malformedServerNames:o};if(!K(e))return{manifests:t,malformedField:!0,malformedServerNames:o};for(let r of d){if(!Object.hasOwn(e,r))continue;let n=e[r],s=K(n)?n.initializeResult:void 0,i=K(n)&&n.toolsListResult!==null?n.toolsListResult:void 0;if(K(s)&&(i===void 0||K(i)))t.set(r,i===void 0?{initializeResult:s}:{initializeResult:s,toolsListResult:i});else o.push(r)}return{manifests:t,malformedField:!1,malformedServerNames:o}}var l="notifications/tools/list_changed";function pjt(e){return K(e)&&!("id"in e)&&e.method===l}
export{B8e,Szr,pjt};
