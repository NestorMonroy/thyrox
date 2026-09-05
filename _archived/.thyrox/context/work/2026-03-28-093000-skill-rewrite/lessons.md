```yml
Fecha: 2026-03-28
Tipo: Lecciones aprendidas
Work: Reescritura de SKILL.md
```

# Lecciones: Reescritura de SKILL.md

## L-001: Description pushy es clave para triggering

**Qué pasó:** La description original (32 palabras) era genérica. La nueva (~80 palabras) cubre edge cases específicos de triggering.

**Por qué importa:** Según skill-creator, Claude tiene tendencia a "undertrigger" — no usar skills cuando serían útiles. La description es el mecanismo primario de triggering.

**Qué hacer próxima vez:** Siempre escribir descriptions de 60-100 palabras con frases que los usuarios realmente dirían.

**Insight:** La description no es documentación — es un mecanismo de matching. Debe contener las frases que el usuario usaría.

## L-002: WHY en una línea es suficiente

**Qué pasó:** Cada fase tiene una línea explicando POR QUÉ es importante ("Entender antes de actuar previene construir lo incorrecto").

**Por qué importa:** skill-creator dice "explain WHY in lieu of heavy-handed MUSTs." Pero no necesitas párrafos — una línea de WHY es más efectiva que MUST en mayúsculas.

**Qué hacer próxima vez:** Una línea de WHY por sección. Si necesitas más, va en references/.

**Insight:** WHY corto > MUST largo. El modelo entiende razones mejor que órdenes.

## L-003: Seguir las 7 fases para reescribir el SKILL evitó saltar pasos

**Qué pasó:** Seguimos ANALYZE → SOLUTION_STRATEGY → PLAN → EXECUTE → TRACK para reescribir el propio SKILL. La sesión anterior (ERR-002, ERR-006) saltaba fases.

**Por qué importa:** El framework funciona — incluso para mejorarse a sí mismo.

**Qué hacer próxima vez:** Usar las fases incluso para trabajo "simple." La estructura no es overhead — es la red de seguridad.

**Insight:** El framework es fractal — aplica a cualquier escala de trabajo, incluyendo su propia mejora.
