// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{O}from"/$bunfs/root/chunk-x7f60hk6.js";import{_,p}from"/$bunfs/root/chunk-vvf2tdhs.js";import{A,Jr}from"/$bunfs/root/chunk-xzmtst7a.js";import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{Se}from"/$bunfs/root/chunk-fvzv4ke0.js";import{Ae}from"/$bunfs/root/chunk-y87vtd8k.js";import{ja}from"/$bunfs/root/chunk-a207t0vs.js";import{Be}from"/$bunfs/root/chunk-2a6tx3x8.js";import{Lfe}from"/$bunfs/root/chunk-ppqsqf6x.js";import{ze}from"/$bunfs/root/chunk-2e0agwm9.js";import{xU}from"/$bunfs/root/chunk-t98c08tj.js";import{ppe}from"/$bunfs/root/chunk-n2mayd00.js";import{promises as a}from"fs";import*as g from"os";import*as o from"path";var E="com.anthropic.claude-code-url-handler",m="Claude Code URL Handler",w="claude-code-url-handler.desktop",P="Claude Code URL Handler.app",c=o.join(g.homedir(),"Applications",P),l=o.join(c,"Contents","MacOS","claude");function d(){return o.join(ppe(),"applications",w)}var u=`HKEY_CURRENT_USER\\Software\\Classes\\${xU}`,h=`${u}\\shell\\open\\command`,f=86400000;function k(e){return`Exec="${e}" --handle-uri %u`}function y(e){return`"${e}" --handle-uri "%1"`}async function D(e){let t=o.join(c,"Contents");try{await a.rm(c,{recursive:!0})}catch(s){if(A(s)!=="ENOENT")throw s}await a.mkdir(o.dirname(l),{recursive:!0});let r=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${E}</string>
  <key>CFBundleName</key>
  <string>${m}</string>
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
        <string>${xU}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;await a.writeFile(o.join(t,"Info.plist"),r),await a.symlink(e,l),await Be("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",["-R",c],{useCwd:!1}),n(`Registered ${xU}:// protocol handler at ${c}`)}async function F(e){await a.mkdir(o.dirname(d()),{recursive:!0});let t=`[Desktop Entry]
Name=${m}
Comment=Handle ${xU}:// deep links for Claude Code
${k(e)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${xU};
`;await a.writeFile(d(),t);let r=await ja("xdg-mime");if(r){let{code:i}=await Be(r,["default",w,`x-scheme-handler/${xU}`],{useCwd:!1});if(i!==0)throw Object.assign(Error(`xdg-mime exited with code ${i}`),{code:"XDG_MIME_FAILED"})}n(`Registered ${xU}:// protocol handler at ${d()}`)}async function L(e){for(let t of[["add",u,"/ve","/d",`URL:${m}`,"/f"],["add",u,"/v","URL Protocol","/d","","/f"],["add",h,"/ve","/d",y(e),"/f"]]){let{code:r}=await Be("reg",t,{useCwd:!1});if(r!==0)throw Object.assign(Error(`reg add exited with code ${r}`),{code:"REG_FAILED"})}n(`Registered ${xU}:// protocol handler in Windows registry`)}async function S(e){let t=e??await C();switch("linux"){case"darwin":await D(t);break;case"linux":await F(t);break;case"win32":await L(t);break;default:throw Error("Unsupported platform: linux")}}async function C(){let e=Lfe();try{return await a.realpath(e),e}catch{return process.execPath}}async function x(e){try{switch("linux"){case"darwin":return await a.readlink(l)===e;case"linux":return(await a.readFile(d(),"utf8")).includes(k(e));case"win32":{let{stdout:t,code:r}=await Be("reg",["query",h,"/ve"],{useCwd:!1});return r===0&&t.includes(y(e))}default:return!1}}catch{return!1}}async function KNn(e){if(ze().disableDeepLinkRegistration==="disable")return;if(!["darwin","linux","win32"].includes("linux"))return;let t=await C();if(await x(t))return;let r=o.join(Se(),".deep-link-register-failed");if(O()&&e!==void 0){let i=await e.stat(Ae.state("deep-link-register-failed"));if(i.ok&&Date.now()-i.value.mtimeMs<f)return}else try{let i=await a.stat(r);if(Date.now()-i.mtimeMs<f)return}catch{}try{if(await S(t),_("deep_link_register"),n("Auto-registered claude-cli:// deep link protocol handler"),O()&&e!==void 0)await e.delete(Ae.state("deep-link-register-failed"));else await a.rm(r,{force:!0}).catch(()=>{})}catch(i){let s=Jr(i);if(p("deep_link_register",s??"register_failed"),n(`Failed to auto-register deep link protocol handler: ${i instanceof Error?i.message:String(i)}`,{level:"warn"}),s==="EACCES"||s==="ENOSPC")if(O()&&e!==void 0)await e.write(Ae.state("deep-link-register-failed"),"",{publishDiscipline:"inPlace"});else await a.writeFile(r,"").catch(()=>{})}}
export{KNn};
