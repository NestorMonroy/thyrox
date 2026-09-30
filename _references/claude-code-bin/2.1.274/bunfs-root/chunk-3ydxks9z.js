// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Vc}from"/$bunfs/root/chunk-r2c9k9kh.js";function Lr(e,s){if(!e.trim()||!s.trim())return null;let t=Vc(s),a=new RegExp(`<${t}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${t}>`,"gi"),n,i=0,l=0,o=new RegExp(`<${t}(?:\\s+[^>]*?)?>`,"gi"),r=new RegExp(`<\\/${t}>`,"gi");while((n=a.exec(e))!==null){let c=n[1],g=e.slice(l,n.index);i=0,o.lastIndex=0;while(o.exec(g)!==null)i++;r.lastIndex=0;while(r.exec(g)!==null)i--;if(i===0&&c)return c;l=n.index+n[0].length}return null}function kEe(e){return e.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g,"")}
export{Lr,kEe};
