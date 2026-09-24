#!/usr/bin/env python3
"""El dato de una grafica NO esta en el cuerpo del documento.

`docx_to_text` declaraba esta frontera en su propia cabecera —«**No lee los
graficos.** Un ``chart1.xml`` lleva sus series en XML y aqui no se tocan»— y
el ejecutor entrega el archivo que la vuelve un hueco caro: en
`EAP_MIPYMES_25.docx` del INEGI, las cifras de equipo de computo, internet y
ventas por internet POR TAMANO DE UNIDAD viven en graficas, no en cuadros.
Volcar el cuerpo las pierde todas.

Medido sobre ese archivo ANTES de escribir una linea, que es lo que vuelve
cada trampa un defecto seguro y no una hipotesis::

    graficas 10 · c:ser 24 · c:pt 186 · ptCount declarado 194
    sin ninguna serie en cache: chart3, chart9, chart10 (3 de 10)
    libros incrustados 8 · series filtradas (c15) 0 · multiLvlStrCache 0

Las cuatro cifras que deciden:

1. **186 puntos contra 194 declarados.** Ocho puntos que el `ptCount` promete
   y el cache no trae. Concretamente, en `chart7` dos series declaran cuatro
   valores cada una y **cachean cero**. Un lector que crea al `ptCount`
   publica cuatro cifras inventadas; uno que crea al cache y calle publica
   «no hay serie». Ninguno de los dos dice lo que pasa.
2. **`c:pt` lleva `idx`.** Es la misma trampa que la celda dispersa del
   `.xlsx`: un punto que falta corre a los siguientes una posicion y la
   categoria deja de corresponder a su valor, sin que nada avise.
3. **3 de 10 graficas no cachean nada y las 3 traen libro incrustado.** El
   dato existe, en `word/embeddings/*.xlsx`. Devolver la lista vacia es
   verde sobre cero: hay que nombrar el libro.
4. **`c:tx` aparece 5 veces en `chart5` para 1 sola serie.** El titulo de la
   grafica y los de los ejes tambien son `c:tx`. Buscarlo con `iter` le pone
   a la serie el series_name del eje.

Y el orden: con **10** graficas, ordenar por series_name pone `chart10` entre
`chart1` y `chart2`, y la «Grafica 2» del documento deja de ser la segunda.
"""

import pathlib
import subprocess
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from corpus import docx_to_text  # noqa: E402
from paths import reach  # noqa: E402

W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
PKG = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"'
C = 'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"'
A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
C15 = 'xmlns:c15="http://schemas.microsoft.com/office/drawing/2012/chart"'
R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'


def build(path, charts=None, rels=None):
    """Un paquete con cuerpo vacio y las partes de grafica que se le den.

    ``graficas`` es ``{series_name: xml-de-dentro-de-chartSpace}`` y ``rels`` es
    ``{series_name: xml-de-su-.rels}``.
    """
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
        z.writestr("word/document.xml",
                   f'<?xml version="1.0"?><w:document {W}><w:body/>'
                   f'</w:document>')
        for series_name, body in (charts or {}).items():
            z.writestr("word/charts/%s" % series_name,
                       f'<?xml version="1.0"?><c:chartSpace {C} {A} {C15} {R}>'
                       f'{body}</c:chartSpace>')
        for series_name, body in (rels or {}).items():
            z.writestr("word/charts/_rels/%s.rels" % series_name, body)


def points(label, pairs, declared):
    """Un cache con los pares ``(idx, valor)`` que se le den."""
    body = "".join('<c:pt idx="%d"><c:v>%s</c:v></c:pt>' % par
                     for par in pairs)
    return ('<c:%sCache><c:ptCount val="%d"/>%s</c:%sCache>'
            % (label, declared, body, label))


def one_series(series_name=None, cats=None, vals=None, declared=None):
    parts = []
    if series_name is not None:
        parts.append('<c:tx><c:strRef><c:f>Hoja1!$A$1</c:f>'
                      '<c:strCache><c:ptCount val="1"/>'
                      '<c:pt idx="0"><c:v>%s</c:v></c:pt>'
                      '</c:strCache></c:strRef></c:tx>' % series_name)
    if cats is not None:
        n = declared if declared is not None else len(cats)
        parts.append('<c:cat><c:strRef><c:f>Hoja1!$B$1</c:f>%s'
                      '</c:strRef></c:cat>' % points("str", cats, n))
    if vals is not None:
        n = declared if declared is not None else len(vals)
        parts.append('<c:val><c:numRef><c:f>Hoja1!$C$1</c:f>%s'
                      '</c:numRef></c:val>' % points("num", vals, n))
    return "<c:ser>%s</c:ser>" % "".join(parts)


def bars(*series):
    return ('<c:chart><c:plotArea><c:barChart>%s</c:barChart>'
            '</c:plotArea></c:chart>' % "".join(series))


class TestThePoint(unittest.TestCase):
    def test_1_a_MISSING_point_does_not_shift_the_following_ones(self):
        """CONTROL POSITIVO de la trampa 2, la que mas dano hace.

        Cuatro categorias, y el valor de la segunda no esta en el cache. Un
        lector que anexe en orden de documento le pone a `Pequenas` el valor
        de `Medianas` y a `Medianas` el de `Grandes`: tres cifras mal
        atribuidas de cuatro, y ninguna se ve mal.
        """
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(
                cats=[(0, "Micro"), (1, "Pequenas"), (2, "Medianas"),
                      (3, "Grandes")],
                vals=[(0, "25.3"), (2, "63.4"), (3, "88.1")],
                declared=4))})
            s = docx_to_text.charts(f)[0].series[0]
            self.assertEqual(s.categories,
                             ["Micro", "Pequenas", "Medianas", "Grandes"])
            self.assertEqual(s.values, [25.3, None, 63.4, 88.1])

    def test_2_the_gap_is_None_and_NOT_zero(self):
        """Un valor ausente no es un cero. Promediar la serie con ceros
        baja la media y el hueco desaparece del resultado."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(
                vals=[(0, "10"), (2, "30")], declared=3))})
            self.assertEqual(docx_to_text.charts(f)[0].series[0].values,
                             [10.0, None, 30.0])

    def test_3_an_EMPTY_series_declares_its_gap_and_does_not_fill_it(self):
        """Real en `chart7`: dos series con `ptCount` 4 y cero puntos.

        Ni se inventan cuatro valores ni se calla: se dicen los dos numeros,
        el declarado y el que hay.
        """
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(
                one_series(series_name="2023", vals=[], declared=4))})
            s = docx_to_text.charts(f)[0].series[0]
            self.assertEqual(s.declared, 4)
            self.assertEqual(s.cached, 0)
            self.assertEqual(s.values, [None, None, None, None])

    def test_4_cached_counts_the_points_that_ARE_there(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(
                vals=[(0, "10"), (2, "30")], declared=3))})
            s = docx_to_text.charts(f)[0].series[0]
            self.assertEqual((s.declared, s.cached), (3, 2))

    def test_5_an_UNREADABLE_value_does_not_bring_down_the_series(self):
        """`c:v` puede traer `#N/A` o venir vacio. Es un hueco, no un fallo
        del lector: las demas cifras de la serie siguen siendo buenas."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(
                vals=[(0, "10"), (1, "#N/A"), (2, "30")], declared=3))})
            self.assertEqual(docx_to_text.charts(f)[0].series[0].values,
                             [10.0, None, 30.0])


class TestTheCategory(unittest.TestCase):
    def test_6_a_NUMERIC_category_is_not_lost(self):
        """Un eje de anos es `c:numCache`, no `c:strCache`. Un lector que
        solo mire el de cadenas deja la serie sin eje y las cifras sin ano."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            cat = ('<c:cat><c:numRef><c:f>Hoja1!$B$1</c:f>%s</c:numRef>'
                   '</c:cat>' % points("num", [(0, "2018"), (1, "2023")], 2))
            build(f, {"chart1.xml": bars(
                "<c:ser>%s%s</c:ser>"
                % (cat, '<c:val><c:numRef>%s</c:numRef></c:val>'
                   % points("num", [(0, "4.8"), (1, "5.5")], 2)))})
            s = docx_to_text.charts(f)[0].series[0]
            self.assertEqual(s.categories, ["2018", "2023"])
            self.assertEqual(s.values, [4.8, 5.5])

    def test_7_a_series_WITHOUT_categories_invents_no_axis(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(vals=[(0, "10")]))})
            self.assertEqual(docx_to_text.charts(f)[0].series[0].categories,
                             [None])


class TestTheName(unittest.TestCase):
    def test_8_a_data_LABEL_does_not_become_a_series_name(self):
        """CONTROL POSITIVO de la trampa 4, medido en `chart5` del archivo
        real: 5 `c:tx` para 1 serie, y los cuatro de mas **anidan dentro de
        la propia serie**, no fuera. Son etiquetas de dato y su texto es
        `[VALOR]`. Un `iter` sobre la serie los alcanza, asi que una serie
        sin series_name acaba llamandose `[VALOR]`.

        Dos versiones anteriores de este test NO discriminaron, y las dos
        se descartaron midiendo, no razonando: la primera puso el `c:tx`
        sobrante en el eje —FUERA de la serie, donde ningun `iter` sobre la
        serie llega—; la segunda lo puso dentro pero como texto rico
        (`c:rich`), que es la forma que trae `chart5`, y esa tampoco filtra
        porque no lleva cache. La que si filtra es la etiqueta atada a
        celdas, que lleva `c:strCache`: por `iter`, una serie sin series_name
        acaba llamandose `[VALOR]`.
        """
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            label = ('<c:dLbls><c:dLbl><c:idx val="0"/><c:tx>'
                        '<c:strRef><c:f>Hoja1!$Z$1</c:f>%s</c:strRef>'
                        '</c:tx></c:dLbl></c:dLbls>'
                        % points("str", [(0, "[VALOR]")], 1))
            body = ('<c:ser>%s<c:val><c:numRef>%s</c:numRef></c:val>'
                      '</c:ser>'
                      % (label, points("num", [(0, "10")], 1)))
            build(f, {"chart1.xml": bars(body)})
            s = docx_to_text.charts(f)[0].series[0]
            self.assertIsNone(s.name)

    def test_8b_the_label_does_not_cover_a_name_that_IS_there(self):
        """CONTROL DE ANULACION del anterior: un lector que devolviera
        siempre `None` pasaria el test 8."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            label = ('<c:dLbls><c:dLbl><c:idx val="0"/><c:tx>'
                        '<c:strRef><c:f>Hoja1!$Z$1</c:f>%s</c:strRef>'
                        '</c:tx></c:dLbl></c:dLbls>'
                        % points("str", [(0, "[VALOR]")], 1))
            interior = one_series(series_name="Pequenas", vals=[(0, "82.1")])
            body = interior.replace("</c:ser>", label + "</c:ser>")
            build(f, {"chart1.xml": bars(body)})
            self.assertEqual(docx_to_text.charts(f)[0].series[0].name,
                             "Pequenas")

    def test_9_the_chart_TITLE_is_read_in_the_other_vocabulary(self):
        """El titulo va en `a:t` de DrawingML, no en el espacio de la
        grafica. Es la unica etiqueta que dice de que es el cuadro."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            title = ('<c:title><c:tx><c:rich><a:p><a:r>'
                      '<a:t>Personal Ocupado</a:t></a:r></a:p></c:rich>'
                      '</c:tx></c:title>')
            build(f, {"chart1.xml": (
                '<c:chart>%s<c:plotArea><c:barChart>%s</c:barChart>'
                '</c:plotArea></c:chart>'
                % (title, one_series(vals=[(0, "10")])))})
            self.assertEqual(docx_to_text.charts(f)[0].title,
                             "Personal Ocupado")

    def test_10_a_title_SPLIT_across_runs_is_joined(self):
        """Misma trampa que el parrafo del cuerpo: el formato corta el
        titulo en varios `a:r`."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            title = ('<c:title><c:tx><c:rich><a:p>'
                      '<a:r><a:t>Ventas por </a:t></a:r>'
                      '<a:r><a:t>internet</a:t></a:r>'
                      '</a:p></c:rich></c:tx></c:title>')
            build(f, {"chart1.xml": (
                '<c:chart>%s<c:plotArea><c:barChart>%s</c:barChart>'
                '</c:plotArea></c:chart>'
                % (title, one_series(vals=[(0, "10")])))})
            self.assertEqual(docx_to_text.charts(f)[0].title,
                             "Ventas por internet")

    def test_11_a_chart_WITHOUT_a_title_does_not_invent_one(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(vals=[(0, "10")]))})
            self.assertIsNone(docx_to_text.charts(f)[0].title)


class TestWhatIsNotDumped(unittest.TestCase):
    def test_12_a_FILTERED_series_does_not_come_back(self):
        """Hermana de `w:delText` en el cuerpo: una serie que alguien
        **quito** de la grafica se queda cacheada en `c:extLst` bajo
        `c15:filteredBarSeries`. Volcarla publica como vigente lo que no se
        ve en el documento. Medido: cero en este archivo, y la guarda se
        queda porque el siguiente archivo si las trae."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            hidden = ('<c:extLst><c:ext><c15:filteredBarSeries>%s'
                      '</c15:filteredBarSeries></c:ext></c:extLst>'
                      % one_series(series_name="retirada", vals=[(0, "99")]))
            build(f, {"chart1.xml": (
                '<c:chart><c:plotArea><c:barChart>%s%s</c:barChart>'
                '</c:plotArea></c:chart>'
                % (one_series(series_name="vigente", vals=[(0, "10")]), hidden))})
            g = docx_to_text.charts(f)[0]
            self.assertEqual([s.name for s in g.series], ["vigente"])

    def test_13_the_ACTIVE_series_does_come_out(self):
        """CONTROL DE ANULACION del anterior: sin este par, un lector que
        devolviera la lista vacia pasaria el test 12."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(
                one_series(series_name="vigente", vals=[(0, "10")]))})
            self.assertEqual(
                [s.name for s in docx_to_text.charts(f)[0].series],
                ["vigente"])


class TestTheGap(unittest.TestCase):
    def test_14_a_chart_WITHOUT_cache_names_its_workbook(self):
        """Real en chart3, chart9 y chart10: tres de diez. El dato existe,
        en `word/embeddings/*.xlsx`, y el arbol ya sabe leerlo con
        `xlsx_to_text`. Devolver la lista vacia es verde sobre cero."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            rel = ('<?xml version="1.0"?><Relationships %s>'
                   '<Relationship Id="rId1" Type="http://schemas.openxml'
                   'formats.org/officeDocument/2006/relationships/package" '
                   'Target="../embeddings/Hoja.xlsx"/></Relationships>'
                   % PKG)
            build(f,
                  {"chart1.xml": '<c:chart><c:plotArea/></c:chart>'
                                 '<c:externalData r:id="rId1"/>'},
                  {"chart1.xml": rel})
            g = docx_to_text.charts(f)[0]
            self.assertEqual(g.series, [])
            self.assertEqual(g.workbook, "word/embeddings/Hoja.xlsx")

    def test_15_a_chart_without_a_workbook_declares_it_absent(self):
        """CONTROL DE ANULACION del anterior: el libro se lee del paquete,
        no se supone."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(vals=[(0, "10")]))})
            self.assertIsNone(docx_to_text.charts(f)[0].workbook)

    def test_16_a_document_WITHOUT_charts_returns_an_empty_list(self):
        """Real: el `.docx` del calendario del INEGI trae cero. No es un
        fallo y no es un documento ilegible."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f)
            self.assertEqual(docx_to_text.charts(f), [])


class TestTheOrder(unittest.TestCase):
    def test_17_chart10_comes_AFTER_chart9_and_not_between_1_and_2(self):
        """Con 10 graficas —que es justo lo que trae el archivo real—,
        ordenar por series_name pone `chart10` en segundo lugar y la «Grafica 2»
        del documento deja de ser la segunda de la lista."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart%d.xml" % i: bars(one_series(vals=[(0, str(i))]))
                      for i in (1, 2, 9, 10)})
            g = docx_to_text.charts(f)
            self.assertEqual([x.part.rsplit("/", 1)[1] for x in g],
                             ["chart1.xml", "chart2.xml", "chart9.xml",
                              "chart10.xml"])


class TestLineSurface(unittest.TestCase):
    def _run(self, *args):
        wrapper = (reach.thyrox_root()
                      / "bin" / "docx_to_text")
        return subprocess.run(["bash", str(wrapper), *args],
                              capture_output=True, text=True)

    def test_18_charts_dumps_category_and_value_together(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f, {"chart1.xml": bars(one_series(
                series_name="Internet",
                cats=[(0, "Micro"), (1, "Pequenas")],
                vals=[(0, "22.6"), (1, "82.1")]))})
            r = self._run("--charts", str(f))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("Micro", r.stdout)
            self.assertIn("82.1", r.stdout)
            self.assertIn("Internet", r.stdout)

    def test_19_without_charts_it_says_NO_SUBJECT_and_not_OK(self):
        """Verde sobre cero no es verde: cero graficas no se publica como
        un volcado bueno de cero lineas."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            build(f)
            r = self._run("--charts", str(f))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("SIN SUJETO", r.stdout + r.stderr)

    def test_20_the_embedded_workbook_is_named_in_the_output(self):
        """La salida tiene que decir el siguiente paso, no solo que falta:
        el arbol ya trae `bin/xlsx_to_text`."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            rel = ('<?xml version="1.0"?><Relationships %s>'
                   '<Relationship Id="rId1" Type="http://schemas.openxml'
                   'formats.org/officeDocument/2006/relationships/package" '
                   'Target="../embeddings/Hoja.xlsx"/></Relationships>'
                   % PKG)
            build(f,
                  {"chart1.xml": '<c:chart><c:plotArea/></c:chart>'
                                 '<c:externalData r:id="rId1"/>'},
                  {"chart1.xml": rel})
            r = self._run("--charts", str(f))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("word/embeddings/Hoja.xlsx", r.stdout)

    def test_21_the_body_remains_the_default(self):
        """CONTROL DE ANULACION: el volcado del cuerpo no cambia porque se
        haya anadido una bandera."""
        with tempfile.TemporaryDirectory() as tmp:
            f = pathlib.Path(tmp) / "x.docx"
            with zipfile.ZipFile(f, "w") as z:
                z.writestr("_rels/.rels", f'<Relationships {PKG}/>')
                z.writestr("word/document.xml",
                           f'<?xml version="1.0"?><w:document {W}><w:body>'
                           f'<w:p><w:r><w:t>cuerpo</w:t></w:r></w:p>'
                           f'</w:body></w:document>')
            r = self._run(str(f))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("cuerpo", r.stdout)
            self.assertIn("bloques", r.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
