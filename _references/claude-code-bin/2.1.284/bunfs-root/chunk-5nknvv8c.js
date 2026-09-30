// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Vo}from"/$bunfs/root/chunk-37s48y77.js";var d=/^[A-Za-z0-9][A-Za-z0-9-]*$/,a=new Set(["restricted"]),sno=["system-prompt-file","append-system-prompt-file","append-subagent-system-prompt-file"];function ivt(n,s,i){let e=String(i);if(e.length>1&&e.startsWith("-"))n.push(`--${s}=${e}`);else n.push(`--${s}`,e)}function H5t(n,s,i,e){let r=0;for(let[t,o]of Object.entries(s)){if(!d.test(t)){e("malformed",JSON.stringify(t));continue}if(i.has(t)){e("blocked",t);continue}if(a.has(t)){if(!Vo(String(o)))n.push(`--${t}`),r++;continue}if(o!=="")ivt(n,t,o),r++}return r}
export{sno,ivt,H5t};
