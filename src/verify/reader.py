#!/usr/bin/env python3
"""El LECTOR de simbolos — el parametro que hace a los niveles agnosticos.

Los cuatro niveles de verificacion de porte (`counterpart_body.py`,
`symbol_home.py`) preguntan siempre lo mismo: **que simbolos declara este
archivo, y que nombres invoca este cuerpo**. Como se contesta esa pregunta
depende del lenguaje, no del nivel — y por tanto es parametro, no mecanismo.

El defecto que esto corrige, medido en este mismo turno
-------------------------------------------------------

La primera version de los dos niveles saco el **vocabulario del dominio**
(Odoo) al consumidor y dejo cableado el **lenguaje**: `ast.parse`,
`ast.ClassDef`, `.py`. Eso los deja utiles para un solo arbol de los que el
proveedor gobierna. Los otros son medibles y estan ahi:

- `ui` declara sus simbolos en JavaScript y JSX;
- `_references/claude-code-bin/<build>/` es TypeScript y JavaScript;
- los corpus vendorizados de `_references/` son de varios lenguajes a la vez.

Sacar el dominio y dejar el lenguaje es la mitad del trabajo: el nivel sigue
sin poder leer lo que el proveedor tiene que gobernar. THYROX es el PRODUCER —
el nivel es suyo; el lenguaje, como el vocabulario, lo declara quien lo usa.

Dos lectores, y ninguno es «el bueno»
--------------------------------------

`AstReader` entiende Python de verdad: distingue una clase anidada de una de
nivel superior, y ve las llamadas del cuerpo por su forma sintactica.
`PatternReader` no entiende ningun lenguaje: reconoce las declaraciones por
los patrones que se le declaran, y por eso alcanza cualquier arbol de texto.

La eleccion no es de calidad sino de **alcance contra resolucion**, y la
ceguera de cada uno se declara aqui para que quien elige la conozca antes.
"""
import ast
import dataclasses
import pathlib
import re


@dataclasses.dataclass(frozen=True)
class Symbol:
    """Un simbolo declarado, en la forma que los niveles consumen.

    `body` es **opaco** para el motor: solo el lector que lo produjo sabe
    interpretarlo, y solo se lo devuelve a si mismo en `called_names`. Es lo
    que permite que un lector de AST entregue un nodo y uno de patrones
    entregue el texto del cuerpo, sin que el nivel note la diferencia.
    """

    name: str
    kind: str            # 'class' | 'function' | 'assign'
    owner: str = ''      # la clase duena; '' si es de nivel superior
    lineno: int = 0
    body: object = None
    bases: tuple = ()


class AstReader:
    """Lector de Python por arbol sintactico. Alta resolucion, un lenguaje.

    *Ve:* la diferencia entre una clase de nivel superior y una anidada, la
    clase duena de cada metodo, las bases declaradas, y toda llamada del
    cuerpo por su forma —incluida la anidada dentro de una comprension o un
    `with`.
    *Ciega a:* todo archivo que no sea Python valido; uno que no parsea no
    aporta simbolos y **no** rompe el recorrido.
    """

    extensions = ('.py',)

    def parse(self, path):
        try:
            return ast.parse(pathlib.Path(path).read_text(errors='ignore'))
        except (SyntaxError, OSError, UnicodeDecodeError):
            return None

    @staticmethod
    def _bases(klass):
        names = []
        for base in klass.bases:
            if isinstance(base, ast.Name):
                names.append(base.id)
            elif isinstance(base, ast.Attribute):
                names.append(base.attr)
        return tuple(names)

    def symbols(self, path):
        tree = self.parse(path)
        if tree is None:
            return []
        found, nested = [], set()
        for klass in ast.walk(tree):
            if not isinstance(klass, ast.ClassDef):
                continue
            bases = self._bases(klass)
            found.append(Symbol(klass.name, 'class', '', klass.lineno,
                                klass, bases))
            for member in klass.body:
                if isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    found.append(Symbol(member.name, 'function', klass.name,
                                        member.lineno, member, bases))
                    nested.add(id(member))
                elif isinstance(member, ast.Assign):
                    for target in member.targets:
                        if isinstance(target, ast.Name):
                            found.append(Symbol(target.id, 'assign',
                                                klass.name, member.lineno,
                                                member, bases))
            nested.add(id(klass))
        for node in tree.body:
            if (isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and id(node) not in nested):
                found.append(Symbol(node.name, 'function', '', node.lineno,
                                    node))
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        found.append(Symbol(target.id, 'assign', '',
                                            node.lineno, node))
        return found

    def top_level(self, path):
        """Solo lo declarado a nivel de modulo — lo que el nivel SITIO mide."""
        tree = self.parse(path)
        if tree is None:
            return []
        out = []
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                out.append(Symbol(node.name, 'class', '', node.lineno, node,
                                  self._bases(node)))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                out.append(Symbol(node.name, 'function', '', node.lineno,
                                  node))
        return out

    def called_names(self, body):
        for sub in ast.walk(body):
            if not isinstance(sub, ast.Call):
                continue
            if isinstance(sub.func, ast.Attribute):
                yield sub.func.attr
            elif isinstance(sub.func, ast.Name):
                yield sub.func.id


#: Patrones para los lenguajes de llave. Son un DEFAULT util, no un canon: un
#: consumidor con otra gramatica declara los suyos y el lector no cambia.
BRACE_DECLARATIONS = (
    ('class', re.compile(r'^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)',
                         re.MULTILINE)),
    ('function', re.compile(
        r'^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)', re.MULTILINE)),
    ('function', re.compile(
        r'^\s*(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(',
        re.MULTILINE)),
)

PYTHON_DECLARATIONS = (
    ('class', re.compile(r'^class\s+(\w+)', re.MULTILINE)),
    ('function', re.compile(r'^def\s+(\w+)', re.MULTILINE)),
)

#: Una llamada, en cualquier lenguaje con sintaxis `nombre(`. Deliberadamente
#: grosero: el nivel CUERPO clasifica por PERTENENCIA a un vocabulario, asi que
#: un nombre de mas que ningun vocabulario contiene no cambia el veredicto.
CALL = re.compile(r'(?:\.|\b)(\w+)\s*\(')


class PatternReader:
    """Lector por patrones declarados. Cualquier arbol de texto, baja resolucion.

    Existe porque el proveedor gobierna arboles que no son Python y para los
    que no hay analizador a mano —TypeScript, JavaScript, el corpus de un
    ejecutable— y la alternativa a leerlos con menos resolucion es **no
    leerlos**, que es peor: un nivel que no alcanza un arbol publica cero
    hallazgos sobre el y ese cero se lee como conformidad.

    *Ve:* toda declaracion que casa con los patrones que se le pasan, y todo
    nombre seguido de parentesis dentro del cuerpo.
    *Ciega a:* el anidamiento —una clase declarada dentro de otra sale como de
    nivel superior—, la clase duena de un metodo, las bases, y la diferencia
    entre una llamada y una definicion que casa el mismo patron. Un veredicto
    de `owner` o de anidamiento sacado de este lector **no es evidencia**.
    """

    def __init__(self, extensions=('.ts', '.tsx', '.js', '.jsx'),
                 declarations=BRACE_DECLARATIONS, call=CALL):
        self.extensions = tuple(extensions)
        self.declarations = tuple(declarations)
        self.call = call

    def _text(self, path):
        try:
            return pathlib.Path(path).read_text(errors='ignore')
        except OSError:
            return None

    def symbols(self, path):
        text = self._text(path)
        if text is None:
            return []
        found = []
        for kind, pattern in self.declarations:
            for match in pattern.finditer(text):
                found.append(Symbol(
                    match.group(1), kind, '',
                    text.count('\n', 0, match.start()) + 1,
                    _region_after(text, match.end())))
        return found

    def top_level(self, path):
        """Sin analizador no hay nivel: devuelve lo mismo que `symbols`.

        Se declara en vez de omitirse para que el consumidor sepa que el
        veredicto de SITIO con este lector cuenta tambien lo anidado. Es la
        ceguera, no un descuido.
        """
        return self.symbols(path)

    def called_names(self, body):
        if not isinstance(body, str):
            return
        for match in self.call.finditer(body):
            yield match.group(1)


def _region_after(text, start, lines=80):
    """El tramo que sigue a una declaracion, como cuerpo aproximado.

    Sin analizador no hay final de bloque; se toma una ventana de lineas. Es
    una **cota**: un cuerpo mas largo queda cortado y sus llamadas no se ven,
    asi que este lector puede decir `sin senal` de un cuerpo que si la tiene.
    Nunca al reves — no inventa llamadas que no estan.
    """
    corte = text.find('\n', start)
    if corte == -1:
        return ''
    resto = text[corte + 1:].split('\n')
    return '\n'.join(resto[:lines])
