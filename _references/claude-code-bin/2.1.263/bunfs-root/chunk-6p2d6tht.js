// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{fo}from"/$bunfs/root/chunk-8a7jwk3w.js";var d=/^[A-Za-z0-9][A-Za-z0-9-]*$/,a=new Set(["restricted"]);function Atn(n,i,s){let t=String(s);if(t.length>1&&t.startsWith("-"))n.push(`--${i}=${t}`);else n.push(`--${i}`,t)}function Nat(n,i,s,t){let r=0;for(let[e,o]of Object.entries(i)){if(!d.test(e)){t("malformed",JSON.stringify(e));continue}if(s.has(e)){t("blocked",e);continue}if(a.has(e)){if(!fo(String(o)))n.push(`--${e}`),r++;continue}if(o!=="")Atn(n,e,o),r++}return r}
export{Atn,Nat};
