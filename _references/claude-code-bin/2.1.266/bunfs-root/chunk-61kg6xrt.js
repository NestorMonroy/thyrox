// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{He}from"/$bunfs/root/chunk-a7esebzw.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{_st}from"/$bunfs/root/chunk-xdb7bs7g.js";import{Wp,dh}from"/$bunfs/root/chunk-btbsn9s4.js";import{MWn}from"/$bunfs/root/chunk-0w0620n7.js";import{rxt}from"/$bunfs/root/chunk-vqs6sgdh.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(He(!1)){this.override=void 0;return}if(rxt()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return _st(e),e.on("error",(r)=>{i("tengu_tty_stream_error",Wp(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function GT(n=!1){MWn();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=dh(),r}
export{GT};
