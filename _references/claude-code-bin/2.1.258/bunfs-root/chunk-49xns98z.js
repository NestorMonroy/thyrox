// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{readFileSync as o}from"fs";import{readFile as i}from"fs/promises";import{isAbsolute as d,join as c}from"path";var u=[40,181,47,253];function s(t){return t.length>=4&&u.every((e,r)=>t[r]===e)}function PVt(t,e){return d(t)?t:c(e,t)}async function l7(t,e){let r=await i(PVt(t,e));return(s(r)?await Bun.zstdDecompress(r):r).toString("utf8")}function nt(t,e){let r=PVt(t,e);try{let n=o(r);return(s(n)?Bun.zstdDecompressSync(n):n).toString("utf8")}catch(n){throw Object.assign(Error("embedded text asset is missing or corrupt",{cause:n}),{path:r})}}
export{PVt,l7,nt};
