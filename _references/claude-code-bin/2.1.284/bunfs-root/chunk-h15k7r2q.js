// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{Qe}from"/$bunfs/root/chunk-x15v86ew.js";import{Vu}from"/$bunfs/root/chunk-p27b6zy4.js";import{homedir as c}from"os";import{dirname as x,join as r,resolve as C}from"path";function s(){let e=a.SHELL||"",i=c(),n=r(i,".claude");if(e.endsWith("/zsh")||e.endsWith("/zsh.exe")){let o=r(n,"completion.zsh");return{name:"zsh",rcFile:r(i,".zshrc"),cacheFile:o,completionLine:`[[ -f "${o}" ]] && source "${o}"`,shellFlag:"zsh"}}if(e.endsWith("/bash")||e.endsWith("/bash.exe")){let o=r(n,"completion.bash");return{name:"bash",rcFile:r(i,".bashrc"),cacheFile:o,completionLine:`[ -f "${o}" ] && source "${o}"`,shellFlag:"bash"}}if(e.endsWith("/fish")||e.endsWith("/fish.exe")){let o=a.XDG_CONFIG_HOME||r(i,".config"),l=r(n,"completion.fish");return{name:"fish",rcFile:r(o,"fish","config.fish"),cacheFile:l,completionLine:`[ -f "${l}" ] && source "${l}"`,shellFlag:"fish"}}return null}async function Qrr(){return}function m(e){let{cmd:i,prefixArgs:n}=Vu();return Qe(i,[...n,"completion",e.shellFlag,"--output",e.cacheFile])}
export{Qrr};
