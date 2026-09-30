// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{k,co}from"/$bunfs/root/chunk-3btyksgt.js";import{F}from"/$bunfs/root/chunk-p7hrkaq4.js";import{_,p}from"/$bunfs/root/chunk-marw4shk.js";import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{we}from"/$bunfs/root/chunk-53a5hn9r.js";import{Re}from"/$bunfs/root/chunk-z0202m3z.js";import{qe}from"/$bunfs/root/chunk-mw9kp8vw.js";import{Ma}from"/$bunfs/root/chunk-j96jysac.js";import{eke}from"/$bunfs/root/chunk-b6v1mxfj.js";import{Ve}from"/$bunfs/root/chunk-m0am9fba.js";import{Bq}from"/$bunfs/root/chunk-vkh4nhwr.js";import{DAe}from"/$bunfs/root/chunk-tk6dc7dv.js";import{promises as n}from"fs";import*as g from"os";import*as o from"path";var P="com.anthropic.claude-code-url-handler",m="Claude Code URL Handler",w="claude-code-url-handler.desktop",D="Claude Code URL Handler.app",c=o.join(g.homedir(),"Applications",D),l=o.join(c,"Contents","MacOS","claude");function d(){return o.join(DAe(),"applications",w)}var u=`HKEY_CURRENT_USER\\Software\\Classes\\${Bq}`,h=`${u}\\shell\\open\\command`,f=86400000;function y(e){return`Exec="${e}" --handle-uri %u`}function C(e){return`"${e}" --handle-uri "%1"`}async function L(e){let r=o.join(c,"Contents");try{await n.rm(c,{recursive:!0})}catch(s){if(k(s)!=="ENOENT")throw s}await n.mkdir(o.dirname(l),{recursive:!0});let i=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${P}</string>
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
        <string>${Bq}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;await n.writeFile(o.join(r,"Info.plist"),i),await n.symlink(e,l),await qe("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",["-R",c],{useCwd:!1}),t(`Registered ${Bq}:// protocol handler at ${c}`)}async function S(e){await n.mkdir(o.dirname(d()),{recursive:!0});let r=`[Desktop Entry]
Name=${m}
Comment=Handle ${Bq}:// deep links for Claude Code
${y(e)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${Bq};
`;await n.writeFile(d(),r);let i=await Ma("xdg-mime");if(i){let{code:a}=await qe(i,["default",w,`x-scheme-handler/${Bq}`],{useCwd:!1});if(a!==0)throw Object.assign(Error(`xdg-mime exited with code ${a}`),{code:"XDG_MIME_FAILED"})}t(`Registered ${Bq}:// protocol handler at ${d()}`)}async function x(e){for(let r of[["add",u,"/ve","/d",`URL:${m}`,"/f"],["add",u,"/v","URL Protocol","/d","","/f"],["add",h,"/ve","/d",C(e),"/f"]]){let{code:i}=await qe("reg",r,{useCwd:!1});if(i!==0)throw Object.assign(Error(`reg add exited with code ${i}`),{code:"REG_FAILED"})}t(`Registered ${Bq}:// protocol handler in Windows registry`)}async function v(e){let r=e??await E();switch("linux"){case"darwin":await L(r);break;case"linux":await S(r);break;case"win32":await x(r);break;default:throw Error("Unsupported platform: linux")}}async function E(){let e=eke();try{return await n.realpath(e),e}catch{return process.execPath}}async function A(e){try{switch("linux"){case"darwin":return await n.readlink(l)===e;case"linux":return(await n.readFile(d(),"utf8")).includes(y(e));case"win32":{let{stdout:r,code:i}=await qe("reg",["query",h,"/ve"],{useCwd:!1});return i===0&&r.includes(C(e))}default:return!1}}catch{return!1}}async function xur(e){if(Ve().disableDeepLinkRegistration==="disable")return;if(!["darwin","linux","win32"].includes("linux"))return;let r=await E();if(await A(r))return;let i=o.join(we(),".deep-link-register-failed");if(F()&&e!==void 0){let a=await e.stat(Re.state("deep-link-register-failed"));if(a.ok&&Date.now()-a.value.mtimeMs<f)return}else try{let a=await n.stat(i);if(Date.now()-a.mtimeMs<f)return}catch{}try{if(await v(r),_("deep_link_register"),t("Auto-registered claude-cli:// deep link protocol handler"),F()&&e!==void 0)await e.delete(Re.state("deep-link-register-failed"));else await n.rm(i,{force:!0}).catch(()=>{})}catch(a){let s=co(a);if(p("deep_link_register",s??"register_failed"),t(`Failed to auto-register deep link protocol handler: ${a instanceof Error?a.message:String(a)}`,{level:"warn"}),s==="EACCES"||s==="ENOSPC")if(F()&&e!==void 0)await e.write(Re.state("deep-link-register-failed"),"",{publishDiscipline:"inPlace"});else await n.writeFile(i,"").catch(()=>{})}}
export{xur};
