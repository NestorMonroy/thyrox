// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{sep as i}from"path";var VMt=new Set([".git","hooks",".husky",".githooks","node_modules",".vscode",".idea","head","config","objects","refs",".claude","skills","commands","agents",".cargo",".devcontainer",".yarn",".mvn"]),qMt=/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/,c=new RegExp(qMt,"g");function Ui(e){let t=e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017f/g,"s");return t.replace(c,"").replace(/:.*$/,"").replace(/[. ]+$/,"")||t}function qHr(e){return!1}function dV(e,t,s){let r=e.slice(t.length).split(i),a=r.length-1;for(let n=0;n<r.length;n++){let o=Ui(r[n]);if(VMt.has(o)||qHr(o))return!0;if(n===a&&s?.has(o))return!0}return!1}
export{VMt,qMt,Ui,qHr,dV};
