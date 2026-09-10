// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{le}from"/$bunfs/root/chunk-ctshp37x.js";var Lxn=/^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/,a=/<command-name>(.*?)<\/command-name>/;function x3(t,i){if(t.type!=="user")return;if(t.isMeta===!0||t.isCompactSummary===!0)return;let s=t.message;if(!s)return;let r=s.content,o=[];if(typeof r==="string")o.push(r);else if(Array.isArray(r))for(let n of r){if(!n||typeof n!=="object")continue;if(n.type==="tool_result")return;if(n.type==="text"&&typeof n.text==="string")o.push(n.text)}for(let n of o){let e=n.replaceAll(`
`," ").trim();if(!e)continue;let c=a.exec(e);if(c){if(!i.commandFallback)i.commandFallback=c[1];continue}let u=/<bash-input>([\s\S]*?)<\/bash-input>/.exec(e);if(u)return`! ${u[1].trim()}`;if(Lxn.test(e))continue;if(e.length>200)e=le(e,200).trim()+"\u2026";return e}return}
export{Lxn,x3};
