// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{bt}from"/$bunfs/root/chunk-deawgr1z.js";import{ne}from"/$bunfs/root/chunk-q77993h4.js";var a=["note","lang"];function uCt(e){if(!ne(e))return null;let r=a.filter((n)=>(n in e)),t,d;if(e.action==="call_endpoint"&&typeof e.body==="string"){let n=bt(e.body,!1);if(Array.isArray(n))t="array";else if(n!==null&&typeof n==="object")t="object";d=n}let o;if(e.action==="write_db"&&typeof e.data==="string"){let n=bt(e.data,!1);if(ne(n))o=n}if(r.length===0&&t===void 0&&o===void 0)return null;let s={...e},i=[];for(let n of r)delete s[n],i.push(`legacy_${n}`);if(t!==void 0)s.body=d,i.push(`body_json_string_to_${t}`);if(o!==void 0)s.data=o,i.push("data_json_string_to_object");return{input:s,shapeClass:i.join("+")}}
export{uCt};
