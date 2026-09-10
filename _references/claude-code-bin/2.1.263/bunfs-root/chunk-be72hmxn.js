// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{xe}from"/$bunfs/root/chunk-8a7jwk3w.js";import{i}from"/$bunfs/root/chunk-y9tkdj4c.js";import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{xnt}from"/$bunfs/root/chunk-w8jp0t25.js";import{im,zg}from"/$bunfs/root/chunk-32f2qmtc.js";import{Q1n}from"/$bunfs/root/chunk-c5ddta38.js";import{vkt}from"/$bunfs/root/chunk-za3yfcd9.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(xe(!1)){this.override=void 0;return}if(vkt()==="mcp"){this.override=void 0;return}try{let t=d("/dev/tty","r"),e=new s(t);return xnt(e),e.on("error",(r)=>{i("tengu_tty_stream_error",im(r)),n(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(t){n(`Could not open /dev/tty for stdin override: ${t}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function hk(t=!1){Q1n();let e=f.get(),r={exitOnCtrlC:t};if(e)r.stdin=e;return r.isScreenReaderEnabled=zg(),r}
export{hk};
