// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Le}from"/$bunfs/root/chunk-fkak21hw.js";import{i}from"/$bunfs/root/chunk-gn6mgw10.js";import{dWt}from"/$bunfs/root/chunk-kn03s03j.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{AWt}from"/$bunfs/root/chunk-jsyn1gcs.js";import{$d,gh}from"/$bunfs/root/chunk-vegxfg9d.js";import{Nro}from"/$bunfs/root/chunk-chwg86z2.js";import{openSync as d}from"fs";import{ReadStream as s}from"tty";class o{override=null;get(){if(this.override!==null)return this.override;if(process.stdin.isTTY){this.override=void 0;return}if(Le(!1)){this.override=void 0;return}if(dWt()==="mcp"){this.override=void 0;return}try{let n=d("/dev/tty","r"),e=new s(n);return AWt(e),e.on("error",(r)=>{i("tengu_tty_stream_error",$d(r)),t(`/dev/tty stream error: ${r}`,{level:"debug"})}),e.isTTY=!0,this.override=e,this.override}catch(n){t(`Could not open /dev/tty for stdin override: ${n}`,{level:"error"}),this.override=void 0;return}}reset(){this.override=null}}var f=new o;function _O(n=!1){Nro();let e=f.get(),r={exitOnCtrlC:n};if(e)r.stdin=e;return r.isScreenReaderEnabled=gh(),r}
export{_O};
