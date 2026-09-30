// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Pe}from"/$bunfs/root/chunk-tep8see7.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{Fwt}from"/$bunfs/root/chunk-yy7a4xwv.js";import{Eu,jy}from"/$bunfs/root/chunk-27bj2wbx.js";import{kyr}from"/$bunfs/root/chunk-gpc3sj48.js";import{g3t}from"/$bunfs/root/chunk-v52c8cd2.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(Pe(!1)){this.override=void 0;return}if(g3t()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return Fwt(e),e.on("error",(r)=>{i("tengu_tty_stream_error",Eu(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function $x(n=!1){kyr();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=jy(),r}
export{$x};
