// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Oe}from"/$bunfs/root/chunk-4a5nddj6.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{aLt}from"/$bunfs/root/chunk-kcjajdc8.js";import{gd,Sy}from"/$bunfs/root/chunk-j2fqyv7e.js";import{CVr}from"/$bunfs/root/chunk-xb8sf4gz.js";import{Nln}from"/$bunfs/root/chunk-xwwap3xv.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(Oe(!1)){this.override=void 0;return}if(Nln()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return aLt(e),e.on("error",(r)=>{i("tengu_tty_stream_error",gd(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function qH(n=!1){CVr();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=Sy(),r}
export{qH};
