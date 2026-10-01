// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{M}from"/$bunfs/root/chunk-hqt9kt0y.js";import{freemem as o}from"os";function qor(){let e=R("tengu_bg_low_mem_mb",1024)*1024*1024;if(e<=0)return{lowMem:!1,level:void 0};if(M()!=="macos")return{lowMem:o()<e,level:void 0};let n=m();return{lowMem:n!==void 0&&n>=l,level:n}}function cse(){return qor().lowMem}var r={normal:1,warning:2,critical:4},l=r.critical;function m(){try{let e=Bun.ant.memoryPressureLevel();return e===null?void 0:r[e]}catch(e){t(`bg low-mem: memoryPressureLevel failed: ${e instanceof Error?e.message:String(e)}`,{level:"warn"});return}}function Kor(){return R("tengu_bg_attach_upgrade",!0)}
export{qor,cse,Kor};
