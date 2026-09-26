// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{dt}from"/$bunfs/root/chunk-sentf9c1.js";import{G$t,ao}from"/$bunfs/root/chunk-shebh248.js";import{pB}from"/$bunfs/root/chunk-an11nt8y.js";import{V}from"/$bunfs/root/chunk-t6d3nxvc.js";var u=["note","lang"],c=`Note: \`label\` was longer than ${pB} characters and was cut to that length; only its start was kept. A label is a few words naming the version, not a description of the changes.`;function wjt(n){if(!V(n))return null;let d=u.filter((e)=>(e in n)),t;if(typeof n.label==="string"&&G$t(n.label)>pB){let e=n.label.replaceAll(`\r
`,`
`).trim(),f=G$t(e)>pB;t={value:f?ao(e,pB).trimEnd():e,cut:f}}let s,r;if(n.action==="call_endpoint"&&typeof n.body==="string"){let e=dt(n.body,!1);if(Array.isArray(e))s="array";else if(e!==null&&typeof e==="object")s="object";r=e}let l;if(n.action==="write_db"&&typeof n.data==="string"){let e=dt(n.data,!1);if(V(e))l=e}let a=(n.action===void 0||n.action==="publish")&&Array.isArray(n.files)&&n.files.some((e)=>typeof e==="string")?n.files.map((e)=>typeof e==="string"?{path:e}:e):void 0;if(d.length===0&&s===void 0&&l===void 0&&a===void 0&&t===void 0)return null;let o={...n},i=[];for(let e of d)delete o[e],i.push(`legacy_${e}`);if(s!==void 0)o.body=r,i.push(`body_json_string_to_${s}`);if(l!==void 0)o.data=l,i.push("data_json_string_to_object");if(a!==void 0)o.files=a,i.push("files_string_list");if(t!==void 0)o.label=t.value,i.push(t.cut?"label_clamped":"label_trimmed");return{input:o,shapeClass:i.join("+"),...t?.cut&&{resultNote:c}}}
export{wjt};
