// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{cd}from"/$bunfs/root/chunk-nqsdwfmt.js";function Hr(l,i){if(!l.trim()||!i.trim())return null;let n=cd(i),x=new RegExp(`<${n}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${n}>`,"gi"),e,t=0,s=0,c=new RegExp(`<${n}(?:\\s+[^>]*?)?>`,"gi"),r=new RegExp(`<\\/${n}>`,"gi");while((e=x.exec(l))!==null){let g=e[1],o=l.slice(s,e.index);t=0,c.lastIndex=0;while(c.exec(o)!==null)t++;r.lastIndex=0;while(r.exec(o)!==null)t--;if(t===0&&g)return g;s=e.index+e[0].length}return null}
export{Hr};
