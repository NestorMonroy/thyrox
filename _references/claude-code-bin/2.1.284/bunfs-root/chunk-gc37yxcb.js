// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
var zxe=String.raw`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}`;function vre(e){return new RegExp(zxe).test(e)}function Sjt(e){let n=[],r=0;for(let t of e.matchAll(new RegExp(zxe,"g")))n.push(e.slice(r,t.index)),r=t.index+t[0].length;return n.push(e.slice(r)),n}function wjt(e){return e.replace(new RegExp(zxe,"g"),(n)=>"x".repeat(n.length))}function rbe(e){return e.replace(new RegExp(zxe,"g"),(n,r)=>`\${${r}}`)}
export{zxe,vre,Sjt,wjt,rbe};
