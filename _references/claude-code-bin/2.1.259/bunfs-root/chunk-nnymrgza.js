// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{M}from"/$bunfs/root/chunk-56nvyfje.js";import{_,f}from"/$bunfs/root/chunk-spz20jb6.js";import{E,so}from"/$bunfs/root/chunk-058caznt.js";import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{be}from"/$bunfs/root/chunk-kn2qhfka.js";import{ve}from"/$bunfs/root/chunk-ptdm1fhw.js";import{Ka}from"/$bunfs/root/chunk-m92n5xra.js";import{Be}from"/$bunfs/root/chunk-zk8esmth.js";import{Spe}from"/$bunfs/root/chunk-mq6t5gsy.js";import{Je}from"/$bunfs/root/chunk-67nd7etf.js";import{dj}from"/$bunfs/root/chunk-nh25nrns.js";import{Wme}from"/$bunfs/root/chunk-7nw1s99d.js";import{promises as n}from"fs";import*as g from"os";import*as o from"path";var KQt="com.anthropic.claude-code-url-handler",p="Claude Code URL Handler",w="claude-code-url-handler.desktop",P="Claude Code URL Handler.app",c=o.join(g.homedir(),"Applications",P),l=o.join(c,"Contents","MacOS","claude");function d(){return o.join(Wme(),"applications",w)}var u=`HKEY_CURRENT_USER\\Software\\Classes\\${dj}`,h=`${u}\\shell\\open\\command`,m=86400000;function k(e){return`Exec="${e}" --handle-uri %u`}function y(e){return`"${e}" --handle-uri "%1"`}async function D(e){let r=o.join(c,"Contents");try{await n.rm(c,{recursive:!0})}catch(s){if(E(s)!=="ENOENT")throw s}await n.mkdir(o.dirname(l),{recursive:!0});let i=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${KQt}</string>
  <key>CFBundleName</key>
  <string>${p}</string>
  <key>CFBundleExecutable</key>
  <string>claude</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSBackgroundOnly</key>
  <true/>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>Claude Code Deep Link</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${dj}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;await n.writeFile(o.join(r,"Info.plist"),i),await n.symlink(e,l),await Be("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",["-R",c],{useCwd:!1}),t(`Registered ${dj}:// protocol handler at ${c}`)}async function F(e){await n.mkdir(o.dirname(d()),{recursive:!0});let r=`[Desktop Entry]
Name=${p}
Comment=Handle ${dj}:// deep links for Claude Code
${k(e)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${dj};
`;await n.writeFile(d(),r);let i=await Ka("xdg-mime");if(i){let{code:a}=await Be(i,["default",w,`x-scheme-handler/${dj}`],{useCwd:!1});if(a!==0)throw Object.assign(Error(`xdg-mime exited with code ${a}`),{code:"XDG_MIME_FAILED"})}t(`Registered ${dj}:// protocol handler at ${d()}`)}async function L(e){for(let r of[["add",u,"/ve","/d",`URL:${p}`,"/f"],["add",u,"/v","URL Protocol","/d","","/f"],["add",h,"/ve","/d",y(e),"/f"]]){let{code:i}=await Be("reg",r,{useCwd:!1});if(i!==0)throw Object.assign(Error(`reg add exited with code ${i}`),{code:"REG_FAILED"})}t(`Registered ${dj}:// protocol handler in Windows registry`)}async function S(e){let r=e??await C();switch("linux"){case"darwin":await D(r);break;case"linux":await F(r);break;case"win32":await L(r);break;default:throw Error("Unsupported platform: linux")}}async function C(){let e=Spe();try{return await n.realpath(e),e}catch{return process.execPath}}async function x(e){try{switch("linux"){case"darwin":return await n.readlink(l)===e;case"linux":return(await n.readFile(d(),"utf8")).includes(k(e));case"win32":{let{stdout:r,code:i}=await Be("reg",["query",h,"/ve"],{useCwd:!1});return i===0&&r.includes(y(e))}default:return!1}}catch{return!1}}async function cBn(e){if(Je().disableDeepLinkRegistration==="disable")return;if(!["darwin","linux","win32"].includes("linux"))return;let r=await C();if(await x(r))return;let i=o.join(be(),".deep-link-register-failed");if(M()&&e!==void 0){let a=await e.stat(ve.state("deep-link-register-failed"));if(a.ok&&Date.now()-a.value.mtimeMs<m)return}else try{let a=await n.stat(i);if(Date.now()-a.mtimeMs<m)return}catch{}try{if(await S(r),_("deep_link_register"),t("Auto-registered claude-cli:// deep link protocol handler"),M()&&e!==void 0)await e.delete(ve.state("deep-link-register-failed"));else await n.rm(i,{force:!0}).catch(()=>{})}catch(a){let s=so(a);if(f("deep_link_register",s??"register_failed"),t(`Failed to auto-register deep link protocol handler: ${a instanceof Error?a.message:String(a)}`,{level:"warn"}),s==="EACCES"||s==="ENOSPC")if(M()&&e!==void 0)await e.write(ve.state("deep-link-register-failed"),"",{publishDiscipline:"inPlace"});else await n.writeFile(i,"").catch(()=>{})}}
export{KQt,cBn};
