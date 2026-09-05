// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{bUb as T,eUb as D,fUb as b,gUb as R,iUb as H}from"/$bunfs/root/_600.js";import{nUb as I,oUb as O}from"/$bunfs/root/_601.js";import{sEc as M}from"/$bunfs/root/_700.js";import{q9c as i,s9c as L}from"/$bunfs/root/_772.js";import{Tbd as _}from"/$bunfs/root/_811.js";import{Vbd as E,Wbd as F,ncd as l}from"/$bunfs/root/_812.js";import{Mud as k,hvd as x,zvd as N}from"/$bunfs/root/_831.js";import{access as j,mkdir as U,readFile as G,stat as C,unlink as V,writeFile as B}from"fs/promises";import{homedir as A}from"os";import{join as c}from"path";F();_();N();L();H();O();M();var a="com.anthropic.claude-daemon",n={useCwd:!1,useToolMemoryCgroup:!1};async function se(){let e=l.XDG_RUNTIME_DIR||`/run/user/${process.getuid()}`;try{return(await C(c(e,"systemd"))).isDirectory()}catch{return!1}}function X(){if(!E())return process.argv[1];return c(I(),"claude")}function f(e){return e.replace(/[\r\n]/g," ").replaceAll("%","%%")}function w(e){let t=f(e);return t.includes(" ")?`"${t}"`:t}function v(){let e=l.XDG_CONFIG_HOME||c(A(),".config");return c(e,"systemd","user",`${a}.service`)}async function ie(e){let{jsonPath:t,logPath:r}=e,s=await R();if(s)return{ok:!1,error:`${s} \u2014 refusing to install a service that would run unwrapped`,serviceId:a,servicePath:""};let u=[...T(),X()],p=l.PATH||"/usr/local/bin:/usr/bin:/bin";{let o=v(),d=`${a}.service`;try{let h=l.XDG_CONFIG_HOME||c(A(),".config");await U(c(h,"systemd","user"),{recursive:!0}),await B(o,`[Unit]
Description=Claude Daemon
After=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=10

[Service]
Type=simple
Environment="PATH=${f(p)}"
ExecStart=${u.map(w).join(" ")} daemon --json-path ${w(t)} --log-file ${w(r)} --origin service
Restart=always
RestartSec=1
StandardOutput=append:${f(r)}
StandardError=append:${f(r)}

[Install]
WantedBy=default.target
`,"utf8")}catch(h){return{ok:!1,error:k(h),serviceId:a,servicePath:o}}await i("systemctl",["--user","daemon-reload"],n);let{code:m,stderr:y,error:g}=await i("systemctl",["--user","enable","--now",d],n);if(m!==0)return{ok:!1,error:y||g||"systemctl enable failed",serviceId:a,servicePath:o};return await i("systemctl",["--user","restart",d],n),{ok:!0,serviceId:a,servicePath:o}}return{ok:!1,error:`service install not available on ${"linux"} \u2014 the daemon runs on demand instead`,serviceId:a,servicePath:""}}async function ne(){{let e=v(),t=`${a}.service`;await i("systemctl",["--user","disable","--now",t],n);try{await V(e)}catch(r){if(!x(r))return{ok:!1,error:k(r)}}return await i("systemctl",["--user","daemon-reload"],n),{ok:!0}}return{ok:!1,error:"service uninstall not available on linux"}}async function oe(){return P("start")}async function ce(){return P("stop")}async function le(){return P("restart")}async function P(e){if(!1)switch(e){case"start":case"stop":case"restart":}{let{code:t,stderr:r,error:s}=await i("systemctl",["--user",e,`${a}.service`],n);if(t!==0)return{ok:!1,error:r||s||`systemctl ${e} failed`};return{ok:!0}}return{ok:!1,error:`service ${e} not available on ${"linux"} \u2014 the daemon runs on demand instead`}}async function W(){let e=v();if(!e)return null;let t;try{let r=await C(e);if(!r.isFile()||r.size>1048576)return null;t=await G(e,"utf8")}catch{return null}return[...t.match(/^ExecStart=(.*)$/m)?.[1]?.matchAll(/"([^"]+)"|(\S+)/g)??[]].map((r)=>r[1]??r[2])}function S(e){return e.replaceAll("%%","%")}async function ue(){let e={execPathStale:!1,launcherPrefixDead:!1},t=await W();if(!t)return e;let r=t.lastIndexOf("daemon"),s=r>0?t[r-1]:void 0;if(!s)return e;try{await j(S(s))}catch{e.execPathStale=!0}let u=t.slice(0,r-1).map(S);for(let p of b(u))if(!await D(p)){e.launcherPrefixDead=!0;break}return e}async function pe(){{let{code:e,stderr:t,error:r}=await i("systemctl",["--user","status",`${a}.service`],n);if(r||t.includes("Failed to connect to bus"))return!1;return e===0||e===3}return!1}
export{se as mo,X as no,ie as oo,ne as po,oe as qo,ce as ro,le as so,ue as to,pe as uo};
