// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ko}from"/$bunfs/root/chunk-zt13kgz5.js";var d=/^[A-Za-z0-9][A-Za-z0-9-]*$/,a=new Set(["restricted"]),h5r=["system-prompt-file","append-system-prompt-file","append-subagent-system-prompt-file"];function Yht(n,s,i){let e=String(i);if(e.length>1&&e.startsWith("-"))n.push(`--${s}=${e}`);else n.push(`--${s}`,e)}function aGt(n,s,i,e){let r=0;for(let[t,o]of Object.entries(s)){if(!d.test(t)){e("malformed",JSON.stringify(t));continue}if(i.has(t)){e("blocked",t);continue}if(a.has(t)){if(!ko(String(o)))n.push(`--${t}`),r++;continue}if(o!=="")Yht(n,t,o),r++}return r}
export{h5r,Yht,aGt};
