// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Oe}from"/$bunfs/root/chunk-zt13kgz5.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{B$t}from"/$bunfs/root/chunk-zx0c9jrs.js";import{wd,Dy}from"/$bunfs/root/chunk-gj4te5f6.js";import{w3r}from"/$bunfs/root/chunk-fr9472ct.js";import{Xun}from"/$bunfs/root/chunk-kbsxbve1.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(Oe(!1)){this.override=void 0;return}if(Xun()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return B$t(e),e.on("error",(r)=>{i("tengu_tty_stream_error",wd(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function fO(n=!1){w3r();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=Dy(),r}
export{fO};
