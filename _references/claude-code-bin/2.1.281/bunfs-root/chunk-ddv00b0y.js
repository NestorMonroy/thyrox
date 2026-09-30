// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ao}from"/$bunfs/root/chunk-4a5nddj6.js";var d=/^[A-Za-z0-9][A-Za-z0-9-]*$/,a=new Set(["restricted"]),vzr=["system-prompt-file","append-system-prompt-file","append-subagent-system-prompt-file"];function ngt(n,s,i){let e=String(i);if(e.length>1&&e.startsWith("-"))n.push(`--${s}=${e}`);else n.push(`--${s}`,e)}function mjt(n,s,i,e){let r=0;for(let[t,o]of Object.entries(s)){if(!d.test(t)){e("malformed",JSON.stringify(t));continue}if(i.has(t)){e("blocked",t);continue}if(a.has(t)){if(!Ao(String(o)))n.push(`--${t}`),r++;continue}if(o!=="")ngt(n,t,o),r++}return r}
export{vzr,ngt,mjt};
