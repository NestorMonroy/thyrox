// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
function t4(n){return n.slice(n.lastIndexOf(")")+2).split(" ")[19]}function sRt(n){let t=n.slice(n.lastIndexOf(")")+2).split(" ")[1],e=t===void 0?NaN:Number.parseInt(t,10);return Number.isNaN(e)?void 0:e}function xYt(n){let t=n.slice(n.lastIndexOf(")")+2).split(" ")[2],e=t===void 0?NaN:Number.parseInt(t,10);return Number.isNaN(e)?void 0:e}function Snt(n){let t=n.lastIndexOf(")");if(t<0)return;let e=n.slice(t+2),r=e.indexOf(" "),i=r<0?e:e.slice(0,r);return i.length===0?void 0:i}function Rhe(n){return n==="Z"||n==="X"}
export{t4,sRt,xYt,Snt,Rhe};
