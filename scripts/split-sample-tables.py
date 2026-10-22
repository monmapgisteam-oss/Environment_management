# Cuts the approved tables of Журмын 3 дугаар хавсралтын А хэсэг out of the
# regulation PDF into one small PDF per subject and report category, for the
# "Загвар татах" links on the submit form. Coordinates are PDF points measured
# from the top-left corner (pdftotext -bbox-layout) of the 2026 edition.
#
#   python3 -I scripts/split-sample-tables.py "/path/Загварууд.pdf"
import sys
from pathlib import Path
import fitz  # PyMuPDF

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/samples/bomt-zagvaruud.pdf')
OUT = Path('public/samples')
TOP, BOTTOM, LEFT, RIGHT = 6, 822, 30, 565  # page body: no running header; page number sits below 822

# category slug -> [(file slug, title, [(page, y_start, y_end | None=to bottom), ...])]
CUTS = {
    'mining': [
        ('negative-impact', 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөө', [(4, 122, 308)]),
        ('rehabilitation', 'Нөхөн сэргээлтийн төлөвлөгөө', [(4, 306, 406)]),
        ('biodiversity', 'Биологийн олон янз байдлыг дүйцүүлэн хамгаалах арга хэмжээний төлөвлөгөө', [(4, 404, 488)]),
        ('resettlement', 'Нүүлгэн шилжүүлэх, нөхөн олговор олгох арга хэмжээний төлөвлөгөө', [(4, 486, 565)]),
        ('heritage', 'Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөө', [(4, 563, 663)]),
        ('risk', 'Осол, эрсдэлийн менежментийн төлөвлөгөө', [(4, 661, 753)]),
        ('waste', 'Хог, хаягдлын менежментийн төлөвлөгөө', [(4, 751, None), (5, TOP, 347)]),
        ('monitoring', 'Орчны хяналт шинжилгээний хөтөлбөр', [(5, 345, 437)]),
        ('management', 'Удирдлага зохион байгуулалтын төлөвлөгөө', [(5, 435, 548)]),
        ('reporting', 'Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөө', [(5, 546, 642)]),
    ],
    'tourism': [
        ('negative-impact', 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөө', [(5, 713, None), (6, TOP, 157)]),
        ('landscaping', 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөө', [(6, 155, 261)]),
        ('heritage', 'Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөө', [(6, 259, 364)]),
        ('waste', 'Хог, хаягдлын менежментийн төлөвлөгөө', [(6, 362, 482)]),
        ('monitoring', 'Орчны хяналт шинжилгээний хөтөлбөр', [(6, 480, 652)]),
        ('management', 'Удирдлага зохион байгуулалтын төлөвлөгөө', [(6, 650, 764)]),
        ('reporting', 'Нөлөөллийн бүсэд оршин суугчдад тайлагнах төлөвлөгөө', [(6, 762, None), (7, TOP, 90)]),
    ],
    'industry': [
        ('negative-impact', 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөө', [(7, 161, 307)]),
        ('landscaping', 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөө', [(7, 305, 411)]),
        ('heritage', 'Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөө', [(7, 409, 514)]),
        ('risk', 'Осол, эрсдэлийн менежментийн төлөвлөгөө', [(7, 512, 637)]),
        ('waste', 'Хог, хаягдлын менежментийн төлөвлөгөө', [(7, 635, 744)]),
        ('monitoring', 'Орчны хяналт шинжилгээний хөтөлбөр', [(7, 742, None), (8, TOP, 162)]),
        ('management', 'Удирдлага зохион байгуулалтын төлөвлөгөө', [(8, 160, 273)]),
        ('reporting', 'Нөлөөллийн бүсэд оршин суугчдад тайлагнах төлөвлөгөө', [(8, 271, 377)]),
    ],
    'infrastructure': [
        ('negative-impact', 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөө', [(8, 448, 594)]),
        ('landscaping', 'Орчны тохижилт, нөхөн сэргээлтийн төлөвлөгөө', [(8, 592, 697)]),
        ('heritage', 'Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөө', [(8, 695, 801)]),
        ('risk', 'Осол, эрсдэлийн менежментийн төлөвлөгөө', [(8, 799, None), (9, TOP, 136)]),
        ('waste', 'Хог, хаягдлын менежментийн төлөвлөгөө', [(9, 134, 253)]),
        ('monitoring', 'Орчны хяналт шинжилгээний хөтөлбөр', [(9, 251, 371)]),
        ('management', 'Удирдлага зохион байгуулалтын төлөвлөгөө', [(9, 369, 482)]),
        ('reporting', 'Нөлөөллийн бүсэд оршин суугчдад тайлагнах төлөвлөгөө', [(9, 480, 596)]),
    ],
}

# Templates for the documents of an annual plan (Журмын 5 дугаар хавсралт):
# the approved cover page (Журмын 1), the plan content with its tables
# (Журмын 3 А) and the checklist (Журмын 6). 'checklist' starts where
# "Журмын 6 дугаар хавсралт" is printed on page 15 and runs to the last page.
PLAN_CUTS = {
    'cover-mining': ('Уул уурхайн төслийн төлөвлөгөөний нүүр хуудасны загвар', [(1, 42, 305)]),
    'cover-general': ('Төлөвлөгөөний нүүр хуудасны загвар', [(1, 606, None), (2, TOP, 86)]),
    'plan-content-mining': ('Уул уурхайн төслийн төлөвлөгөөний агуулга', [(4, 50, None), (5, TOP, 642)]),
    'plan-content-tourism': ('Аялал жуулчлал, үйлчилгээний төслийн төлөвлөгөөний агуулга', [(5, 642, None), (6, TOP, None), (7, TOP, 90)]),
    'plan-content-industry': ('Хөдөө аж ахуй, үйлдвэрлэлийн төслийн төлөвлөгөөний агуулга', [(7, 90, None), (8, TOP, 377)]),
    'plan-content-infrastructure': ('Дэд бүтцийн төслийн төлөвлөгөөний агуулга', [(8, 377, None), (9, TOP, 596)]),
}

src = fitz.open(SRC)
made = []

checklist_top = src[14].search_for('Журмын 6 дугаар хавсралт')[0].y0 - 4
PLAN_CUTS['checklist'] = (
    'Байгаль орчны менежментийн төлөвлөгөөний хяналтын хуудас',
    [(15, checklist_top, None)] + [(n, TOP, None) for n in range(16, src.page_count + 1)],
)
(OUT / 'plan').mkdir(parents=True, exist_ok=True)
for slug, (title, parts) in PLAN_CUTS.items():
    out = fitz.open()
    for page_no, y0, y1 in parts:
        out.insert_pdf(src, from_page=page_no - 1, to_page=page_no - 1)
        out[-1].set_cropbox(fitz.Rect(LEFT, y0, RIGHT, BOTTOM if y1 is None else y1))
    out.set_metadata({'title': title, 'subject': 'Байгаль орчны менежментийн төлөвлөгөөний батлагдсан загвар'})
    path = OUT / 'plan' / f'{slug}.pdf'
    out.save(path, garbage=4, deflate=True)
    made.append((path, len(parts), path.stat().st_size))
for category, cuts in CUTS.items():
    (OUT / category).mkdir(parents=True, exist_ok=True)
    for slug, title, parts in cuts:
        out = fitz.open()
        for page_no, y0, y1 in parts:
            out.insert_pdf(src, from_page=page_no - 1, to_page=page_no - 1)
            page = out[-1]
            page.set_cropbox(fitz.Rect(LEFT, y0, RIGHT, BOTTOM if y1 is None else y1))
        out.set_metadata({'title': title, 'subject': 'Байгаль орчны менежментийн төлөвлөгөөний батлагдсан загвар'})
        path = OUT / category / f'{slug}.pdf'
        out.save(path, garbage=4, deflate=True)
        made.append((path, len(parts), path.stat().st_size))
for path, parts, size in made:
    print(f'{path}  pages={parts}  {size // 1024} KB')
