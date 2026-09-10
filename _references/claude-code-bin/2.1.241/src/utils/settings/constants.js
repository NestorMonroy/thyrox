// ==========================================================================
// utils/settings/constants.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/settings/constants.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 6  (5 cadena, 1 nombre)
//   descartadas por ruido (>400 aparic.) : 1
//   sitios de co-ocurrencia : 47  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 5
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

// --- bundle[1577722:1578173]  (451 B)
//     especificidad 7.441 · 6 anclas — 'SETTING_SOURCES'(×1 g2), 'projectSettings'(×133 g1), 'localSettings'(×172 g1), 'flagSettings'(×103 g2), 'userSettings'(×247 g2) …
async function BVo(e,t,r){let n=await e.read([{key:Pn.userSettings(),offset:0,length:I8+1}]);if(!n.ok)return{kind:"failing",code:n.error.code,failureClass:"failureClass"in n.error?n.error.failureClass:void 0};let o=n.value.items[0];if(!o.found)return{kind:"absent"};if(o.totalBytes>I8)return{kind:"oversize"};let i=Nm(o.value),s=r!==void 0&&r.contentHash===i?r.parsed:e$n(c1r(o.value),t);return{kind:"seeded",contentHash:i,size:o.totalBytes,parsed:s}}

// --- bundle[62553:63410]  (857 B)
//     especificidad 5.517 · 5 anclas — 'projectSettings'(×133 g1), 'localSettings'(×172 g1), 'flagSettings'(×103 g2), 'userSettings'(×247 g2), 'policySettings'(×179 g3)
class sGs{#e=void 0;#t=void 0;#r=void 0;#n=null;#o=null;#i=!1;#l=Kxu();#a=!1;flagSettingsPath(){return this.#e}replaceFlagSettingsPath(e){this.#e=e}flagSettingsExpectedContent(){return this.#t}replaceFlagSettingsExpectedContent(e){this.#t=e}flagSettingsFilePinnedContent(){return this.#r}replaceFlagSettingsFilePinnedContent(e){this.#r=e}flagSettingsInline(){return this.#n}replaceFlagSettingsInline(e){this.#n=e}parentManagedSettings(){return this.#o}replaceParentManagedSettings(e){this.#o=e}parentManagedSettingsInvalid(){return this.#i}replaceParentManagedSettingsInvalid(e){this.#i=e}allowedSettingSources(){return this.#l}replaceAllowedSettingSources(e){this.#l=e}useCoworkPlugins(){return this.#a}replaceUseCoworkPlugins(e){this.#a=e}reset(){this.#e=void 0,this.#t=void 0,this.#r=void 0,this.#n=null,this.#o=null,this.#i=!1,this.#l=Kxu(),this.#a=!1}}

// --- bundle[1330231:1330640]  (409 B)
//     especificidad 5.517 · 5 anclas — 'projectSettings'(×133 g1), 'localSettings'(×172 g1), 'flagSettings'(×103 g2), 'userSettings'(×247 g2), 'policySettings'(×179 g3)
function d9u(e){if(e.type!=="prompt")return"builtin";if(e.loadedFrom==="syncedSkills")return"synced";switch(e.source){case"builtin":return"builtin";case"bundled":return"bundled";case"mcp":case"memoryStore":return"remote";case"plugin":return"plugin";case"userSettings":return"user";case"projectSettings":case"localSettings":return"project";case"policySettings":return"managed";case"flagSettings":return"flag"}}

// --- bundle[2884624:2884842]  (218 B)
//     especificidad 5.517 · 5 anclas — 'projectSettings'(×133 g1), 'localSettings'(×172 g1), 'flagSettings'(×103 g2), 'userSettings'(×247 g2), 'policySettings'(×179 g3)
sources:ft(ye({source:Dr(["userSettings","projectSettings","localSettings","flagSettings","policySettings"]),settings:so(O(),Dn())})).describe("Ordered low-to-high priority \u2014 later entries override earlier ones.")

// --- bundle[3541367:3541589]  (222 B)
//     especificidad 5.517 · 5 anclas — 'projectSettings'(×133 g1), 'localSettings'(×172 g1), 'flagSettings'(×103 g2), 'userSettings'(×247 g2), 'policySettings'(×179 g3)
t=_n("policySettings")?.autoMemoryDirectory??_n("flagSettings")?.autoMemoryDirectory??(e?_n("localSettings")?.autoMemoryDirectory??_n("projectSettings")?.autoMemoryDirectory:void 0)??_n("userSettings")?.autoMemoryDirectory

// Habia 47 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
