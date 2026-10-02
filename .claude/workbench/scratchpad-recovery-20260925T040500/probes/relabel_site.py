import re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
R = [
('from PIL import Image, ImageOps\n',
 '''from PIL import Image, ImageOps

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from note_language import BY_CODE, ZH, NoteLanguage  # noqa: E402

# El idioma del sitio. Por defecto zh, el sitio que ya se publica; `--lang
# es-mx` cambia la busqueda de notas, el README del catalogo, el idioma de
# MkDocs y las etiquetas de la interfaz, todo desde `note_language.py`.
SITE: NoteLanguage = ZH


def set_language(code: str) -> None:
    global SITE
    SITE = BY_CODE[code]


def site_label(key: str, **values: object) -> str:
    text = SITE.site_labels[key]
    return text.format(**values) if values else text
'''),
('            f"\\\\footnotetext{{视频讲解区间：{interval}。}}\\n"',
 '            f"\\\\footnotetext{{{site_label(\'footnote_interval\', interval=interval)}}}\\n"'),
("        '\\n??? info \"PDF 图示资源\"\\n'", "        f'\\n??? info \"{site_label(\"pdf_asset_title\")}\"\\n'"),
('        + f"    [打开 PDF 图示]({link})\\n\\n"', '        + f"    [{site_label(\'open_pdf\')}]({link})\\n\\n"'),
("        'target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"查看原图\">\\n'",
 "        f'target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"{site_label(\"view_original\")}\">\\n'"),
("        'target=\"_blank\" rel=\"noopener noreferrer\">查看原图</a></figcaption>\\n'",
 "        f'target=\"_blank\" rel=\"noopener noreferrer\">{site_label(\"view_original\")}</a></figcaption>\\n'"),
('        term = clean_latex_text(label) if label else "说明"', '        term = clean_latex_text(label) if label else site_label("term_default")'),
("        '\\n??? info \"TikZ 图暂未渲染\"\\n'\n        \"    当前构建环境没有成功生成 SVG，保留原始 TikZ 源码。\\n\\n\"",
 "        f'\\n??? info \"{site_label(\"tikz_title\")}\"\\n'\n        f\"    {site_label('tikz_body')}\\n\\n\""),
("        f'\\n??? quote \"未转换的 LaTeX 环境：{block.env}\"\\n'", "        f'\\n??? quote \"{site_label(\"unconverted_env\", env=block.env)}\"\\n'"),
('lambda m: f"\\n> 来源：{clean_latex_text(m.group(1))}\\n", text)', 'lambda m: f"\\n> {site_label(\'source_quote\')}{clean_latex_text(m.group(1))}\\n", text)'),
('    category = "课程"\n', '    category = site_label("category_default")\n'),
('        return "📝 技术文章笔记"', '        return site_label("category_articles")'),
('        return "🎤 演讲与访谈"', '        return site_label("category_talks")'),
('    return "其他"', '    return site_label("category_other")'),
('    actions.append(f"[LaTeX 源码]({tex_link})")', '    actions.append(f"[{site_label(\'latex_source\')}]({tex_link})")'),
('        actions.append(f"[备用 PDF]({pdf_link})")', '        actions.append(f"[{site_label(\'backup_pdf\')}]({pdf_link})")'),
('        actions.append(f"[观看视频]({note.video_url})")', '        actions.append(f"[{site_label(\'watch_video\')}]({note.video_url})")'),
('        ("作者/整理", note.authors),\n        ("来源", note.channel),\n        ("日期", note.date),',
 '        (site_label("meta_authors"), note.authors),\n        (site_label("meta_channel"), note.channel),\n        (site_label("meta_date"), note.date),'),
('        lines.extend(["| 字段 | 内容 |", "| --- | --- |"])', '        lines.extend([f"| {site_label(\'meta_field\')} | {site_label(\'meta_content\')} |", "| --- | --- |"])'),
('    lines.extend([f"共 {len(notes)} 份讲义。", "", "| 讲义 | 日期 | 来源 | 资源 |", "| --- | --- | --- | --- |"])',
 '    lines.extend([site_label("course_total", count=len(notes)), "", site_label("course_header"), "| --- | --- | --- | --- |"])'),
('        resources = [f"[阅读]({page_rel})"]', '        resources = [f"[{site_label(\'read\')}]({page_rel})"]'),
('            resources.append(f"[备用 PDF]({raw_github_url(note.pdf_path.relative_to(note.root))})")',
 '            resources.append(f"[{site_label(\'backup_pdf\')}]({raw_github_url(note.pdf_path.relative_to(note.root))})")'),
('        f"这里是从 `{len(notes)}` 份 LaTeX 讲义自动生成的网页阅读站。正文直接由 `.tex` 渲染成网页，适合浏览、搜索和连续阅读。",',
 '        site_label("index_intro", count=len(notes)),'),
('        "## 课程地图",', '        site_label("index_map"),'),
('<br><small>{count} 份讲义</small>")', '<br><small>{site_label(\'index_count\', count=count)}</small>")'),
('            "## 推荐阅读路线",\n            "",\n            "- 入门 LLM：CS336 → CS224R L09 → CS25 Karpathy Transformer 入门",\n            "- 深入 Agent：Berkeley LLM Agents → Modern Agent → Agentic RL",\n            "- 模型架构：LLM Architect → CS25 Mixtral → CS336 MoE",\n            "- 前沿洞察：Ilya → Dario → State of AI 2026",',
 '            site_label("index_routes"),\n            "",\n            site_label("route_1"),\n            site_label("route_2"),\n            site_label("route_3"),\n            site_label("route_4"),'),
('        "  language: zh",', '        f"  language: {SITE.site_language}",'),
('        "        name: 切换到深色模式",', '        f"        name: {site_label(\'theme_dark\')}",'),
('        "        name: 切换到浅色模式",', '        f"        name: {site_label(\'theme_light\')}",'),
('        "        - zh",', '        f"        - {SITE.site_language}",'),
('        "  - 首页: index.md",\n        "  - 课程:",', '        f"  - {site_label(\'nav_home\')}: index.md",\n        f"  - {site_label(\'nav_courses\')}:",'),
('        lines.append(f"          - 概览: {yaml_quote(course_dir.as_posix() + \'/index.md\')}")',
 '        lines.append(f"          - {site_label(\'nav_overview\')}: {yaml_quote(course_dir.as_posix() + \'/index.md\')}")'),
('    for tex_path in sorted(root.rglob("*-notes.tex"), key=natural_key):', '    for tex_path in sorted(root.rglob(SITE.notes_glob), key=natural_key):'),
('    readme = root / "README.md"\n', '    readme = root / SITE.site_readme\n'),
]
for o, n in R:
    assert s.count(o) == 1, ('ancla', s.count(o), o[:80])
    s = s.replace(o, n)
o = "            '\\n??? warning \"图片资源缺失\"\\n'"
assert s.count(o) == 2
s = s.replace(o, "            f'\\n??? warning \"{site_label(\"missing_image\")}\"\\n'")
for key in ["articles", "aitime", "alibaba-cloud", "interviews", "ungrounded", "zhang-xiaojun", "qingke", "talks"]:
    m = re.search(r'\n        "%s": "[^"]*",' % re.escape(key), s)
    assert m, key
    s = s[:m.start()] + '\n        "%s": site_label("dir:%s"),' % (key, key) + s[m.end():]
for zh, key in [("折叠左侧导航", "NAV_COLLAPSE_LEFT"), ("展开左侧导航", "NAV_RESTORE_LEFT"),
                ("折叠右侧目录", "NAV_COLLAPSE_RIGHT"), ("展开右侧目录", "NAV_RESTORE_RIGHT")]:
    assert s.count(f'"{zh}"') == 1
    s = s.replace(f'"{zh}"', f'"__{key}__"')
head = 'def sidebar_script() -> str:\n    return """'
a = s.index(head)
end = s.index('""".strip()\n', a)
tail = '""".strip()\n'
new = ('def sidebar_script() -> str:\n    script = """' + s[a + len(head):end] + tail +
       '    # Las etiquetas de los botones van como marcadores dentro del JavaScript:\n'
       '    # sus llaves harian fragil una f-string.\n'
       '    for marker, key in (\n'
       '        ("__NAV_COLLAPSE_LEFT__", "nav_collapse_left"),\n'
       '        ("__NAV_RESTORE_LEFT__", "nav_restore_left"),\n'
       '        ("__NAV_COLLAPSE_RIGHT__", "nav_collapse_right"),\n'
       '        ("__NAV_RESTORE_RIGHT__", "nav_restore_right"),\n'
       '    ):\n'
       '        script = script.replace(marker, site_label(key))\n'
       '    return script\n')
s = s[:a] + new + s[end + len(tail):]
open(p, 'w', encoding='utf-8').write(s)
