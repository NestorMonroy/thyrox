// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{sep as c}from"path";var w$t=new Set([".git","hooks",".husky",".githooks","node_modules",".vscode",".idea","head","config","objects","refs",".claude","skills","commands","agents",".cargo",".devcontainer",".yarn",".mvn"]),v$t=/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/,g=new RegExp(v$t,"g");function Ki(e){return i(e,!0)}function kDo(e){return i(e,!1)}function i(e,o){let t=e.toLowerCase().replace(/\u0131/g,"i").replace(/\u017f/g,"s"),n=t.replace(g,"");return(o?n.replace(/:.*$/,""):n).replace(/[. ]+$/,"")||t}function dFr(e){return!1}function Dq(e,o,t){let n=e.slice(o.length).split(c),a=n.length-1;for(let r=0;r<n.length;r++){let s=Ki(n[r]);if(w$t.has(s)||dFr(s))return!0;if(r===a&&t?.has(s))return!0}return!1}
export{w$t,v$t,Ki,kDo,dFr,Dq};
