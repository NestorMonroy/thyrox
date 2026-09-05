// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Fvd as a,dwd as d}from"/$bunfs/root/_832.js";import{xxd as f}from"/$bunfs/root/_837.js";function b(t,i){if(t.type!=="user")return;if(t.isMeta===!0||t.isCompactSummary===!0)return;let s=t.message;if(!s)return;let r=s.content,o=[];if(typeof r==="string")o.push(r);else if(Array.isArray(r))for(let n of r){if(!n||typeof n!=="object")continue;if(n.type==="tool_result")return;if(n.type==="text"&&typeof n.text==="string")o.push(n.text)}for(let n of o){let e=n.replaceAll(`
`," ").trim();if(!e)continue;let c=p.exec(e);if(c){if(!i.commandFallback)i.commandFallback=c[1];continue}let u=/<bash-input>([\s\S]*?)<\/bash-input>/.exec(e);if(u)return`! ${u[1].trim()}`;if(m.test(e))continue;if(e.length>200)e=a(e,200).trim()+"\u2026";return e}return}var m,p;var l=f(()=>{d();m=/^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/,p=/<command-name>(.*?)<\/command-name>/});
export{m as d1c,b as e1c,l as f1c};
