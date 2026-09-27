// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Le}from"/$bunfs/root/chunk-2j44ssk9.js";import{i}from"/$bunfs/root/chunk-ab7mw5d9.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{S1t}from"/$bunfs/root/chunk-19wkka67.js";import{Hd,e_}from"/$bunfs/root/chunk-56zaf0jn.js";import{PQr}from"/$bunfs/root/chunk-0srykc9m.js";import{bhn}from"/$bunfs/root/chunk-r0sw7a0w.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(Le(!1)){this.override=void 0;return}if(bhn()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return S1t(e),e.on("error",(r)=>{i("tengu_tty_stream_error",Hd(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function oO(n=!1){PQr();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=e_(),r}
export{oO};
