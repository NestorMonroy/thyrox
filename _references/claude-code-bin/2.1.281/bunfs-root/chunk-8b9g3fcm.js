// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ft}from"/$bunfs/root/chunk-v5zz2h09.js";import{K}from"/$bunfs/root/chunk-b93xrf5w.js";var a=["note","lang"];function OUt(e){if(!K(e))return null;let d=a.filter((n)=>(n in e)),t,r;if(e.action==="call_endpoint"&&typeof e.body==="string"){let n=ft(e.body,!1);if(Array.isArray(n))t="array";else if(n!==null&&typeof n==="object")t="object";r=n}let o;if(e.action==="write_db"&&typeof e.data==="string"){let n=ft(e.data,!1);if(K(n))o=n}let f=(e.action===void 0||e.action==="publish")&&Array.isArray(e.files)&&e.files.some((n)=>typeof n==="string")?e.files.map((n)=>typeof n==="string"?{path:n}:n):void 0;if(d.length===0&&t===void 0&&o===void 0&&f===void 0)return null;let i={...e},s=[];for(let n of d)delete i[n],s.push(`legacy_${n}`);if(t!==void 0)i.body=r,s.push(`body_json_string_to_${t}`);if(o!==void 0)i.data=o,s.push("data_json_string_to_object");if(f!==void 0)i.files=f,s.push("files_string_list");return{input:i,shapeClass:s.join("+")}}
export{OUt};
