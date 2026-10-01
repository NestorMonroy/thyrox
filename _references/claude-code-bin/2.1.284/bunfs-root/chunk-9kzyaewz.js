// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{l,v}from"/$bunfs/root/chunk-31aa9k3a.js";import{OPe}from"/$bunfs/root/chunk-6b6gfk00.js";import{ns,lt}from"/$bunfs/root/chunk-fybh7qze.js";import{Ljo,lue}from"/$bunfs/root/chunk-g2fq1s1e.js";import{open as f,realpath as g,stat as h}from"fs/promises";import{resolve as c}from"path";var JJr="Error: --agents takes a JSON object, or a file path only with --print (-p). Pass the agents as inline JSON, or run with -p to read them from a file.",s=268435456;function yqt(t){let e=ns(t).trimStart();return e.startsWith("{")||lt(e,!1)!==null}async function QJr(t){let e=c(t);try{await using r=await f(e,OPe());let a=await r.stat({bigint:!0});Ljo(a,e);let o=await g(e).catch(()=>e),n=await h(o,{bigint:!0});if(n.dev!==a.dev||n.ino!==a.ino)return{ok:!1,error:`Error: --agents file changed while it was read: ${e}`};let{content:i}=await lue(r,e,s);return{ok:!0,json:i,filePath:e,realPath:o}}catch(r){switch(v(r)){case"ENOENT":return{ok:!1,error:`Error: --agents file not found: ${e} (a value that is not a JSON object is read as a file path)`};case"ERR_FILE_TOO_LARGE":return{ok:!1,error:`Error: --agents file is larger than ${s} bytes: ${e}`};case"ERR_MULTIPLE_LINKS":return{ok:!1,error:`Error: --agents file has more than one hard link: ${e} (its other names are not write-protected; pass a file with one name)`};default:return{ok:!1,error:`Error reading --agents file ${e}: ${l(r)}`}}}}
export{JJr,yqt,QJr};
