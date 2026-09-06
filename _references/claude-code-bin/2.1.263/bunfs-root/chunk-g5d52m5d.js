// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import"/$bunfs/root/chunk-ah1kb8zv.js";import"/$bunfs/root/chunk-78nzsrc6.js";import{ekn}from"/$bunfs/root/chunk-32f2qmtc.js";import{t_e}from"/$bunfs/root/chunk-bhk66f9m.js";import{createHash as n}from"crypto";function f(d={byId:t_e}){let t=new Map;return{accept({template:r,digest:e,contentBase64:s}){let o=d.byId(r);if(o===void 0)return{ok:!1,kind:"refused",error:"template_refused: unknown_template"};if(!o.digests.some((i)=>i.sha256===e))return{ok:!1,kind:"refused",error:"template_refused: version_mismatch"};if(!ekn.test(s)||s.length%4===1)return{ok:!1,kind:"invalid",error:"invalid_upload: bad_base64"};let a=Buffer.from(s,"base64");if(a.length>o.maxBytes)return{ok:!1,kind:"refused",error:"template_refused: too_large"};if(n("sha256").update(a).digest("hex")!==e)return{ok:!1,kind:"refused",error:"template_refused: digest_mismatch"};if(t.has(e))return{ok:!0,status:"already_stored",template:o,bytes:a.length};return t.set(e,a),{ok:!0,status:"stored",template:o,bytes:a.length}},bytesFor:(r)=>{let e=t.get(r);return e===void 0?void 0:Buffer.from(e)},template:(r)=>d.byId(r),size:()=>t.size,clear:()=>t.clear()}}export{f as createDeviceHookTemplateStore};
