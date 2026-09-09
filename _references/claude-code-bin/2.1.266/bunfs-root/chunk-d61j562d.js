// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{pt}from"/$bunfs/root/chunk-xj9n0xxp.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{Fe}from"/$bunfs/root/chunk-f80rn6zv.js";import{UW}from"/$bunfs/root/chunk-4wqcg6m9.js";var c="it2";class u{inITerm2=null;it2Command="it2";recordInITerm2(e){this.inITerm2=e}recordIt2Command(e){this.it2Command=e}}function I(){return{cachedDetectionResult:null,backendsRegistered:!1,inProcessFallbackActive:!1,TmuxBackendClass:null,ITermBackendClass:null,tmuxBackend:null,itermBackend:null,terminalProbes:new u}}var H8=I();var d=a.TMUX,T=a.TMUX_PANE;function ukt(){return!!d}async function Pz(){return ukt()}function Y3t(){return T||null}function X3t(){if(!d)return null;return pt(d,",")||null}async function Tse(){return(await Fe(UW,["-V"])).code===0}function bN(e=H8){let{terminalProbes:o}=e;if(o.inITerm2!==null)return o.inITerm2;let s=a.TERM_PROGRAM,i=!!a.ITERM_SESSION_ID,l=a.terminal==="iTerm.app",n=s==="iTerm.app"||i||l;return o.recordInITerm2(n),n}function Zkn(e=H8){return e.terminalProbes.it2Command}async function BUe(e=H8){let o=a.SHELL||"/bin/zsh",s=await Fe(o,["-lc",`command -v ${c}`],{useCwd:!1,timeout:2000}),i=s.code===0?s.stdout.split(`
`).map((m)=>m.trim()).filter(Boolean).at(-1)??"":"",l=async(m)=>Fe(m,["session","list"]),n=i||c,r=await l(n);if(i&&r.code!==0&&(r.code===127||/ENOENT/i.test(r.error??"")))n=c,r=await l(n);if(r.code!==0)return t(`[isIt2CliAvailable] '${n} session list' failed (code=${r.code}): ${r.stderr||r.error||"no stderr"}. `+(i?"it2 was found on PATH \u2014 check that the iTerm2 Python API is enabled "+"(Preferences > General > Magic > Enable Python API).":"it2 was not found on PATH (including login-shell PATH).")),!1;return e.terminalProbes.recordIt2Command(n),!0}
export{H8,ukt,Pz,Y3t,X3t,Tse,bN,Zkn,BUe};
