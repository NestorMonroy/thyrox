// ==========================================================================
// skills/mcpSkillBuilders.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/skills/mcpSkillBuilders.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 6  (0 cadena, 6 nombre)
//   descartadas por ruido (>400 aparic.) : 7
//   sitios de co-ocurrencia : 4
//   regiones emitidas  : 3
//
// COMO SE LOCALIZO. El minificador mangla los identificadores
// locales y preserva los literales de cadena y las claves de
// objeto. Un ancla frecuente no discrimina sola; se cruza con
// las demas del mismo archivo en una ventana de 4000 B.
//
// La puntuacion de un sitio NO es su numero de anclas: es la
// suma de log10(ventanas/apariciones)/grado de cada una. El
// grado es en cuantos archivos del arbol aparece el ancla: un
// nombre que citan doce fragmentos no es de ninguno. El umbral
// se DERIVA del bundle — aqui 3.85 = log10(7062).
// ==========================================================================

// --- bundle[8628279:8628596]  (317 B)
//     especificidad 8.062 · 3 anclas — 'createSkillCommand'(×3 g1), 'builders'(×7 g1), 'parseSkillFrontmatterFields'(×3 g2)
async function aOS(e,t,r,n,o){let i=await TLf(e.name,t,o);if(i.hit)return Rt(e.name,`Skill '${t.name}' cache hit \u2014 no resources/read`),DLf({client:e,uri:t.uri,fallbackName:t.name,rawContent:i.skillMd,builders:r});return lOS({client:e,uri:t.uri,fallbackName:t.name,builders:r,onError:n,cacheEntry:t,storageV5:o})}

// --- bundle[5512220:5514599]  (2379 B)
//     especificidad 6.373 · 3 anclas — 'createSkillCommand'(×3 g1), 'parseSkillFrontmatterFields'(×3 g2), 'registered'(×342 g1)
async function _Pp(e,t,r){try{let n=e.filter((d)=>(d.skillsDirs??[]).length>0);if(n.length===0)return;if(zt()==="windows"){E("memory-skills: store skills are not loaded on Windows (no O_NOFOLLOW)",{level:"warn"}),be("memory_store_skills","windows_unsupported");return}if(l4()){E("memory-skills: not loaded with slash commands disabled (no surface reads the registry)",{level:"warn"}),be("memory_store_skills","slash_commands_disabled");return}if(tyt()){E("memory-skills: not loaded under skills-as-tools (no surface reads the registry)",{level:"warn"}),be("memory_store_skills","skills_as_tools_unsupported");return}if(sT("skills")){E("memory-skills: not loaded under strictPluginOnlyCustomization (memoryStore is not an admin-trusted source)",{level:"warn"}),be("memory_store_skills","plugin_only_policy");let d=m3n();if(d.replace([]))d.changed.emit();return}let o=new Map(t.map((d)=>[d.mountName,d])),i=[],s=new Set,a=!1,l=!1,c=(d,p)=>{a=!0,E(`memory-skills: skipping ${d} \u2014 ${p}`,{level:"warn"})};for(let d of n){if(d.scope!=="team"){c(d.mount,"skillsDirs is team-store only");continue}let p=o.get(d.mount);if(!p){c(d.mount,"no sync state for mount");continue}let f=await e3e(p.mountDir,"team",d.mount);if(f==="absent"){c(d.mount,"mount dir does not exist");continue}if(f!=="ok"){c(d.mount,"mount dir escapes its canonical location");continue}if(!await L1a(p.mountDir,p.backend.partitionId)){c(d.mount,"mount dir not adopted by this partition");continue}let h=r&&yIa(p.mountDir);for(let g of d.skillsDirs??[]){let y=tbp({scope:"team",mount:d.mount},g),_=g.split("/"),b=await e3e(y,"team",d.mount,..._);if(b==="absent")continue;if(b!=="ok"){c(d.mount,`skills dir ${g} resolves through a symlink or escapes the mount`);continue}let S=await A1t("team",d.mount,..._),w=await FUv(S,c,d,r,h&&{projectKey:h.projectKey,relPath:[...h.relPath,..._]});for(let H of w.commands){if(s.has(H.name)){E(`memory-skills: ${H.name} already registered by an earlier skills dir \u2014 ignoring the copy in ${g} (${d.mount})`);continue}s.add(H.name),i.push(H)}l||=w.truncated}}let u=m3n();if(u.replace(i))u.changed.emit();if(i.length>0)E(`memory-skills: registered ${i.length} skill(s) under ${hPp}`);if(a)be("memory_store_skills","store_skipped");if(l)be("memory_store_skills","skills_truncated");if(!a&&!l)Ee("memory_store_skills")}catch(n){He(n),pe("memory_store_skills","register_failed")}}

// --- bundle[14155015:14155398]  (383 B)
//     especificidad 5.058 · 2 anclas — 'createSkillCommand'(×3 g1), 'parseSkillFrontmatterFields'(×3 g2)
()=>{Ai();J1();tt();ZQ();c6n();Jt();jt();jme();loe();FNt();Isr();Kqr();lf();r3e();yu();WC();Ji();Ve();uh();mr();_o();st();vS();ys();Za();_N();dqo();nUn();$r();Ahe();xi();Ey();k6n();Ppr();gy();J4e();SQ();Co();CZ();$Si();L$();iui();I9a();Drn=require("fs/promises"),F$m=L(W$t(),1),ph=require("path");izw=new Hr(()=>pp(szw));sbp({createSkillCommand:Prn,parseSkillFrontmatterFields:jqi})}

