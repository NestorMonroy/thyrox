// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
function N_(t){return t}function lo(t){return t}function V4(t){return typeof t==="string"&&t.length<=200&&/^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(t)&&!/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(t)}var r="[\\w-]{1,63}",o=new RegExp(`^${r}$`),u=/^[\w-]{1,128}$/;function YSe(t){return u.test(t)}var a=new RegExp(`^a(?:${r}-)?[0-9a-f]{16}$`);function Pk(t){return a.test(t)?t:null}import{createHash as f,randomBytes as g}from"crypto";var d=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;function mW(t,s){let i=Buffer.from(s.replace(/-/g,""),"hex"),n=f("sha1").update(i).update(Buffer.from(t,"utf8")).digest();n[6]=n[6]&15|80,n[8]=n[8]&63|128;let e=n.subarray(0,16).toString("hex");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20,32)}`}function Xt(t){if(typeof t!=="string")return null;return d.test(t)?t:null}function ag(t){if(t&&!o.test(t))t=t.replace(/[^\w-]/g,"").slice(0,63);let s=g(8).toString("hex");return t?`a${t}-${s}`:`a${s}`}
export{N_,lo,V4,YSe,Pk,mW,Xt,ag};
