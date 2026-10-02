import os
import json
import urllib.parse
import html
import re
from datetime import datetime

def normalize_source(code):
    """Return plain, readable JS from a source file.

    Source files come in two flavours:
      * raw JS (GOD-MODE.js, ...)
      * ready-made bookmarklets that start with `javascript:` and are
        sometimes hand-encoded (%27 = ', %60 = `, %25 = %, ...)
    The second kind must be URL-decoded ONCE, otherwise the generator
    double-encodes it and the bookmarklet breaks with "Unexpected token '%'".
    """
    code = code.strip()
    was_url = False
    if code.lower().startswith('javascript:'):
        was_url = True
        code = code[len('javascript:'):].lstrip()
        try:
            code = urllib.parse.unquote(code, errors='strict')
        except UnicodeDecodeError:
            code = urllib.parse.unquote(code)
    return code, was_url


def is_self_contained(code):
    """True if code is already a single IIFE like (function(){...})() or (()=>{...})()."""
    c = code.rstrip().rstrip(';').rstrip()
    return bool(re.match(r'^\(\s*(async\s+)?(function\b|\(.*?\)\s*=>|[A-Za-z_$][\w$]*\s*=>)', c)) and c.endswith(')')


def generate_bookmarklet(code):
    code, was_url = normalize_source(code)
    # a trailing // comment would swallow the closing wrapper, so always end on a newline
    if was_url and is_self_contained(code):
        body = code.rstrip().rstrip(';') + ';'
    else:
        body = '(function(){' + code + '\n})();'
    # keep it as small as possible but safe: encode only what a URL needs
    encoded = urllib.parse.quote(body, safe="!~*'()-._,:;/@=+$[]")
    return 'javascript:' + encoded


def get_scripts(base_dir):
    categories = {}
    if not os.path.exists(base_dir):
        print(f"Error: {base_dir} does not exist.")
        return {}
        
    ignore_folders = {'.git', '.github', 'node_modules', '__pycache__', '.astro'}
    
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in ignore_folders]
        
        category = os.path.relpath(root, base_dir)
        if category == '.':
            category = 'General'
        
        js_files = [f for f in files if f.endswith('.js')]
        if category == 'General':
             js_files = [f for f in js_files if f not in ['generate_gallery.py']]

        if not js_files:
            continue
            
        if category not in categories:
            categories[category] = []
            
        for f in js_files:
            file_path = os.path.join(root, f)
            try:
                with open(file_path, 'r', encoding='utf-8') as js_file:
                    content = js_file.read()
                    if '==UserScript==' in content:
                        print(f"Skipped (Tampermonkey userscript, not a bookmarklet): {file_path}")
                        continue
                    bm = generate_bookmarklet(content)
                    if len(bm) > 32000:
                        print(f"Warning: {file_path} is {len(bm)//1000}KB as a bookmarklet; Firefox/Safari may truncate it.")
                    categories[category].append({
                        'name': f.replace('.js', '').replace('_', ' '),
                        'code': normalize_source(content)[0],
                        'bookmarklet': bm
                    })
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    return categories

def generate_html(categories):
    cat_names = sorted(categories.keys())
    if 'General' in cat_names:
        cat_names.remove('General')
        cat_names.insert(0, 'General')

    last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    style_css = """
        :root {
            color-scheme: light dark;
            --wall: #cbc7bf; --tahoe-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMax slice'%3E%3Cdefs%3E%3ClinearGradient id='k' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23dce8f2'/%3E%3Cstop offset='1' stop-color='%23f3f7fa'/%3E%3C/linearGradient%3E%3ClinearGradient id='w' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%236fa6c6'/%3E%3Cstop offset='1' stop-color='%23bfe6df'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1600' height='470' fill='url(%23k)'/%3E%3Cpath d='M0 440L120 405 230 430 360 340 470 410 560 382 700 300 820 400 930 362 1050 322 1180 420 1300 382 1420 342 1530 410 1600 392V470H0Z' fill='%23b7c8d6'/%3E%3Cpath d='M322 372L360 340 398 374 378 366 360 382 342 366Z' fill='%23eaf1f7'/%3E%3Cpath d='M648 340L700 300 752 342 724 334 700 356 676 334Z' fill='%23eaf1f7'/%3E%3Cpath d='M1004 354L1050 322 1098 356 1072 350 1050 366 1028 350Z' fill='%23eaf1f7'/%3E%3Cpath d='M1384 372L1420 342 1458 374 1438 368 1420 382 1402 368Z' fill='%23eaf1f7'/%3E%3Cpath d='M0 470V452C200 422 380 452 560 442S900 412 1150 446 1450 432 1600 452V470Z' fill='%237f97a8'/%3E%3Crect y='470' width='1600' height='430' fill='url(%23w)'/%3E%3Cg transform='translate(0,940) scale(1,-1)' opacity='.22'%3E%3Cpath d='M0 440L120 405 230 430 360 340 470 410 560 382 700 300 820 400 930 362 1050 322 1180 420 1300 382 1420 342 1530 410 1600 392V470H0Z' fill='%23b7c8d6'/%3E%3Cpath d='M322 372L360 340 398 374 378 366 360 382 342 366Z' fill='%23eaf1f7'/%3E%3Cpath d='M648 340L700 300 752 342 724 334 700 356 676 334Z' fill='%23eaf1f7'/%3E%3Cpath d='M1004 354L1050 322 1098 356 1072 350 1050 366 1028 350Z' fill='%23eaf1f7'/%3E%3Cpath d='M1384 372L1420 342 1458 374 1438 368 1420 382 1402 368Z' fill='%23eaf1f7'/%3E%3Cpath d='M0 470V452C200 422 380 452 560 442S900 412 1150 446 1450 432 1600 452V470Z' fill='%237f97a8'/%3E%3C/g%3E%3Crect y='470' width='1600' height='430' fill='url(%23w)' opacity='.35'/%3E%3Cg fill='%23ffffff' opacity='.5'%3E%3Crect x='160' y='560' width='360' height='2' rx='1'/%3E%3Crect x='820' y='600' width='420' height='2' rx='1'/%3E%3Crect x='360' y='680' width='300' height='2' rx='1'/%3E%3Crect x='1090' y='720' width='360' height='2' rx='1'/%3E%3C/g%3E%3Cellipse cx='1150' cy='894' rx='280' ry='30' fill='%23d4f1ea' opacity='.5'/%3E%3Cellipse cx='255' cy='894' rx='190' ry='22' fill='%23d4f1ea' opacity='.45'/%3E%3Cpath d='M980 900C960 782 1060 722 1190 746 1300 766 1340 842 1320 900Z' fill='%23a7a498'/%3E%3Cpath d='M1012 800C1062 756 1150 746 1222 766 1150 766 1072 790 1012 800Z' fill='%23d6d3c7' opacity='.8'/%3E%3Cpath d='M110 900C100 812 200 772 300 792 380 807 412 862 402 900Z' fill='%23b4b0a4'/%3E%3Cpath d='M140 826C180 796 250 788 305 800 250 802 188 812 140 826Z' fill='%23d6d3c7' opacity='.8'/%3E%3Cpath d='M610 900C605 856 660 832 710 842 752 850 768 882 762 900Z' fill='%239c998e'/%3E%3Cpath d='M630 866C650 848 690 842 716 848 690 852 654 858 630 866Z' fill='%23d6d3c7' opacity='.8'/%3E%3C/svg%3E"); --bright-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMax slice'%3E%3Cdefs%3E%3ClinearGradient id='s' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%238fb8e3'/%3E%3Cstop offset='.5' stop-color='%23d6e4f4'/%3E%3Cstop offset='.78' stop-color='%23f6e8dc'/%3E%3Cstop offset='1' stop-color='%23fbe3c6'/%3E%3C/linearGradient%3E%3CradialGradient id='g' cx='1120' cy='470' r='620' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23fff4e0' stop-opacity='.9'/%3E%3Cstop offset='.3' stop-color='%23ffe3c0' stop-opacity='.4'/%3E%3Cstop offset='1' stop-color='%23ffe3c0' stop-opacity='0'/%3E%3C/radialGradient%3E%3ClinearGradient id='r1' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23b9c6e0'/%3E%3Cstop offset='1' stop-color='%23e3dfe6'/%3E%3C/linearGradient%3E%3ClinearGradient id='r2' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%239fb2d6'/%3E%3Cstop offset='1' stop-color='%23d3d3e2'/%3E%3C/linearGradient%3E%3ClinearGradient id='r3' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%238499c4'/%3E%3Cstop offset='1' stop-color='%23b9bfd9'/%3E%3C/linearGradient%3E%3ClinearGradient id='d' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23f1dcc0'/%3E%3Cstop offset='1' stop-color='%23e2c19a'/%3E%3C/linearGradient%3E%3Cfilter id='b' x='-20%25' y='-100%25' width='140%25' height='300%25'%3E%3CfeGaussianBlur stdDeviation='16'/%3E%3C/filter%3E%3Cfilter id='b2' x='-20%25' y='-100%25' width='140%25' height='300%25'%3E%3CfeGaussianBlur stdDeviation='6'/%3E%3C/filter%3E%3Cfilter id='n' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='2.2' intercept='-.6'/%3E%3CfeFuncG type='linear' slope='2.2' intercept='-.6'/%3E%3CfeFuncB type='linear' slope='2.2' intercept='-.6'/%3E%3CfeFuncA type='linear' slope='0' intercept='1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3CradialGradient id='v' cx='.5' cy='.45' r='.75'%3E%3Cstop offset='.55' stop-color='%233a2e3f' stop-opacity='0'/%3E%3Cstop offset='1' stop-color='%233a2e3f' stop-opacity='.22'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23s)'/%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Cg fill='%23fff' filter='url(%23b)'%3E%3Cellipse cx='330' cy='190' rx='230' ry='20' opacity='.55'/%3E%3Cellipse cx='470' cy='162' rx='130' ry='14' opacity='.45'/%3E%3Cellipse cx='1330' cy='150' rx='200' ry='16' opacity='.5'/%3E%3Cellipse cx='880' cy='290' rx='260' ry='12' opacity='.3'/%3E%3C/g%3E%3Cg fill='%23fff' filter='url(%23b2)' opacity='.5'%3E%3Cellipse cx='300' cy='205' rx='150' ry='5'/%3E%3Cellipse cx='1300' cy='162' rx='120' ry='4'/%3E%3C/g%3E%3Cpath d='M0 560C140 520 260 470 400 482S600 540 760 500 1000 410 1180 440 1440 520 1600 480V900H0Z' fill='url(%23r1)'/%3E%3Cpath d='M0 640C180 590 340 560 520 590S820 660 1020 610 1360 540 1600 590V900H0Z' fill='url(%23r2)'/%3E%3Cpath d='M0 720C200 680 400 660 620 690S980 750 1200 710 1480 670 1600 690V900H0Z' fill='url(%23r3)'/%3E%3Cpath d='M0 800C260 760 520 770 800 800S1300 830 1600 780V900H0Z' fill='url(%23d)'/%3E%3Cpath d='M0 800C260 760 520 770 800 800S1300 830 1600 780' fill='none' stroke='%23fff6e6' stroke-width='2' opacity='.55'/%3E%3Crect y='520' width='1600' height='160' fill='%23fff1dc' opacity='.14' filter='url(%23b)'/%3E%3Crect width='1600' height='900' fill='url(%23v)'/%3E%3Crect width='1600' height='900' filter='url(%23n)' opacity='.42' style='mix-blend-mode:soft-light'/%3E%3C/svg%3E"); --hills-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMax slice'%3E%3Cdefs%3E%3ClinearGradient id='s' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23c9d3e6'/%3E%3Cstop offset='.6' stop-color='%23efdcc3'/%3E%3Cstop offset='1' stop-color='%23f3e2c6'/%3E%3C/linearGradient%3E%3CradialGradient id='g' cx='.72' cy='.38' r='.34'%3E%3Cstop offset='0' stop-color='%23fff4d8' stop-opacity='.8'/%3E%3Cstop offset='1' stop-color='%23fff4d8' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23s)'/%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Cpath d='M0 560C200 500 380 470 600 520S980 600 1200 520 1500 470 1600 500V900H0Z' fill='%23b9bfa6'/%3E%3Cpath d='M0 640C220 560 420 560 650 610S1050 700 1300 620 1520 590 1600 610V900H0Z' fill='%23a3a77f'/%3E%3Cpath d='M0 720C260 650 520 660 760 710S1180 790 1400 720 1560 700 1600 710V900H0Z' fill='%23c4a95e'/%3E%3Cpath d='M0 790C300 730 560 760 820 800S1250 850 1600 770V900H0Z' fill='%238f9466'/%3E%3Cpath d='M0 850C400 810 800 860 1100 840S1500 820 1600 835V900H0Z' fill='%236f7a52'/%3E%3C/svg%3E");
            --win: #f6f6f8; --side: #ececf1;
            --card: #ffffff; --card-hi: #fbfbfd;
            --line: rgba(60,60,67,0.16); --line-soft: rgba(60,60,67,0.09);
            --text: #1d1d1f; --text-2: #6e6e73; --text-3: #8e8e93;
            --accent: #0a84ff; --accent-press: #0071e3;
            --field: rgba(118,118,128,0.12); --sel: rgba(10,132,255,0.16);
            --shadow-win: 0 12px 36px rgba(30,30,60,0.25), 0 0 0 0.5px rgba(0,0,0,0.25);
            --code-bg: #1e1e20; --code-text: #e6e6ea;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --wall: #191a1c; --tahoe-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMax slice'%3E%3Cdefs%3E%3ClinearGradient id='k' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%230c1727'/%3E%3Cstop offset='1' stop-color='%23213a52'/%3E%3C/linearGradient%3E%3ClinearGradient id='w' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%2310344c'/%3E%3Cstop offset='1' stop-color='%231d6a7c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1600' height='470' fill='url(%23k)'/%3E%3Cpath d='M0 440L120 405 230 430 360 340 470 410 560 382 700 300 820 400 930 362 1050 322 1180 420 1300 382 1420 342 1530 410 1600 392V470H0Z' fill='%232b4056'/%3E%3Cpath d='M322 372L360 340 398 374 378 366 360 382 342 366Z' fill='%236a8aa6'/%3E%3Cpath d='M648 340L700 300 752 342 724 334 700 356 676 334Z' fill='%236a8aa6'/%3E%3Cpath d='M1004 354L1050 322 1098 356 1072 350 1050 366 1028 350Z' fill='%236a8aa6'/%3E%3Cpath d='M1384 372L1420 342 1458 374 1438 368 1420 382 1402 368Z' fill='%236a8aa6'/%3E%3Cpath d='M0 470V452C200 422 380 452 560 442S900 412 1150 446 1450 432 1600 452V470Z' fill='%231d2e41'/%3E%3Crect y='470' width='1600' height='430' fill='url(%23w)'/%3E%3Cg transform='translate(0,940) scale(1,-1)' opacity='.3'%3E%3Cpath d='M0 440L120 405 230 430 360 340 470 410 560 382 700 300 820 400 930 362 1050 322 1180 420 1300 382 1420 342 1530 410 1600 392V470H0Z' fill='%232b4056'/%3E%3Cpath d='M322 372L360 340 398 374 378 366 360 382 342 366Z' fill='%236a8aa6'/%3E%3Cpath d='M648 340L700 300 752 342 724 334 700 356 676 334Z' fill='%236a8aa6'/%3E%3Cpath d='M1004 354L1050 322 1098 356 1072 350 1050 366 1028 350Z' fill='%236a8aa6'/%3E%3Cpath d='M1384 372L1420 342 1458 374 1438 368 1420 382 1402 368Z' fill='%236a8aa6'/%3E%3Cpath d='M0 470V452C200 422 380 452 560 442S900 412 1150 446 1450 432 1600 452V470Z' fill='%231d2e41'/%3E%3C/g%3E%3Crect y='470' width='1600' height='430' fill='url(%23w)' opacity='.35'/%3E%3Cg fill='%236fb3c4' opacity='.5'%3E%3Crect x='160' y='560' width='360' height='2' rx='1'/%3E%3Crect x='820' y='600' width='420' height='2' rx='1'/%3E%3Crect x='360' y='680' width='300' height='2' rx='1'/%3E%3Crect x='1090' y='720' width='360' height='2' rx='1'/%3E%3C/g%3E%3Cellipse cx='1150' cy='894' rx='280' ry='30' fill='%232c8794' opacity='.5'/%3E%3Cellipse cx='255' cy='894' rx='190' ry='22' fill='%232c8794' opacity='.45'/%3E%3Cpath d='M980 900C960 782 1060 722 1190 746 1300 766 1340 842 1320 900Z' fill='%233b3e44'/%3E%3Cpath d='M1012 800C1062 756 1150 746 1222 766 1150 766 1072 790 1012 800Z' fill='%236f737b' opacity='.8'/%3E%3Cpath d='M110 900C100 812 200 772 300 792 380 807 412 862 402 900Z' fill='%2333363b'/%3E%3Cpath d='M140 826C180 796 250 788 305 800 250 802 188 812 140 826Z' fill='%236f737b' opacity='.8'/%3E%3Cpath d='M610 900C605 856 660 832 710 842 752 850 768 882 762 900Z' fill='%232c2e33'/%3E%3Cpath d='M630 866C650 848 690 842 716 848 690 852 654 858 630 866Z' fill='%236f737b' opacity='.8'/%3E%3C/svg%3E"); --hills-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMax slice'%3E%3Cdefs%3E%3ClinearGradient id='s' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%230d111b'/%3E%3Cstop offset='.6' stop-color='%231e2233'/%3E%3Cstop offset='1' stop-color='%232b2a3a'/%3E%3C/linearGradient%3E%3CradialGradient id='g' cx='.72' cy='.38' r='.34'%3E%3Cstop offset='0' stop-color='%23aab4d4' stop-opacity='.8'/%3E%3Cstop offset='1' stop-color='%23aab4d4' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23s)'/%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Cpath d='M0 560C200 500 380 470 600 520S980 600 1200 520 1500 470 1600 500V900H0Z' fill='%231f2736'/%3E%3Cpath d='M0 640C220 560 420 560 650 610S1050 700 1300 620 1520 590 1600 610V900H0Z' fill='%231b2a2e'/%3E%3Cpath d='M0 720C260 650 520 660 760 710S1180 790 1400 720 1560 700 1600 710V900H0Z' fill='%231a2c28'/%3E%3Cpath d='M0 790C300 730 560 760 820 800S1250 850 1600 770V900H0Z' fill='%2315221e'/%3E%3Cpath d='M0 850C400 810 800 860 1100 840S1500 820 1600 835V900H0Z' fill='%230f1815'/%3E%3C/svg%3E");
                --win: #242428; --side: #2d2d32;
                --card: #2c2c30; --card-hi: #323237;
                --line: rgba(255,255,255,0.14); --line-soft: rgba(255,255,255,0.07);
                --text: #f5f5f7; --text-2: #a1a1a6; --text-3: #8e8e93;
                --accent: #0a84ff; --accent-press: #409cff;
                --field: rgba(118,118,128,0.28); --sel: rgba(10,132,255,0.30);
                --shadow-win: 0 12px 36px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.18);
                --code-bg: #141416;
            }
        }
        * { box-sizing: border-box; }
        html { -webkit-text-size-adjust: 100%; }
        body {
            margin: 0; min-height: 100vh; padding: 40px 20px 28px;
            color: var(--text);
            font: 14px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif;
            -webkit-font-smoothing: antialiased;
            background: var(--wall);
            height: 100vh; height: 100dvh; overflow: hidden;
        }
        body::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
            background: var(--wall-img) center bottom / cover no-repeat; }
        body { --wall-img: var(--tahoe-img); } body[data-wall="bright"] { --wall-img: var(--bright-img); } body[data-wall="hills"] { --wall-img: var(--hills-img); }
        button { font: inherit; color: inherit; }
        :focus-visible { outline: 3px solid var(--sel); outline-offset: 1px; }

        .window {
            max-width: 1180px; margin: 0 auto; border-radius: 12px; overflow: hidden;
            background: var(--win); box-shadow: var(--shadow-win);
            height: 100%; min-height: 0; display: flex; flex-direction: column;
        }
        .titlebar { flex: none;
            display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
            height: 52px; padding: 0 16px; border-bottom: 1px solid var(--line);
        }
        .lights { display: flex; gap: 8px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; border: 0.5px solid rgba(0,0,0,0.18); padding: 0; }
        .dot.r { background: #ff5f57; } .dot.y { background: #febc2e; } .dot.g { background: #28c840; }
        .win-title { font-weight: 600; font-size: 13px; color: var(--text); display: flex; align-items: center; gap: 8px; }
        .win-title i { color: var(--accent); }
        .search {
            justify-self: end; display: flex; align-items: center; gap: 8px; width: 100%; max-width: 230px;
            height: 28px; padding: 0 10px; border-radius: 8px; background: var(--field);
        }
        .search i { color: var(--text-3); font-size: 12px; }
        .search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; }
        .search input::placeholder { color: var(--text-3); }
        .search:focus-within { box-shadow: 0 0 0 3px var(--sel); }

        .layout { display: grid; grid-template-columns: 224px 1fr; grid-template-rows: minmax(0, 1fr); flex: 1; min-height: 0; }
        .sidebar { background: var(--side); border-right: 1px solid var(--line); padding: 14px 10px; overflow-y: auto; min-height: 0; }
        .side-label { font-size: 11px; font-weight: 600; color: var(--text-3); padding: 4px 10px 6px; }
        #categoryFilters { display: flex; flex-direction: column; gap: 2px; }
        .cat-filter {
            display: flex; align-items: center; gap: 9px; width: 100%; text-align: left;
            padding: 5px 10px; border: 0; border-radius: 7px; background: transparent; cursor: default;
        }
        .cat-filter:hover { background: var(--line-soft); }
        .cat-filter.active { background: var(--accent); color: #fff; }
        .cat-filter .ico {
            width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center;
            color: #fff; font-size: 10px; flex: none;
        }
        .cat-filter .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cat-filter .count { font-size: 12px; color: var(--text-3); }
        .cat-filter.active .count { color: rgba(255,255,255,0.8); }

        .content { padding: 22px 0 0; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
        .content-head, .hint { padding: 0 26px; flex: none; }
        .scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 10px 26px 26px; border-top: 1px solid transparent; transition: border-color .2s; scrollbar-width: thin; scrollbar-color: rgba(128,128,128,.45) transparent; }
        .scroll.scrolled { border-top-color: var(--line); }
        .scroll::-webkit-scrollbar, .sidebar::-webkit-scrollbar { width: 10px; }
        .scroll::-webkit-scrollbar-thumb, .sidebar::-webkit-scrollbar-thumb { background: rgba(128,128,128,.4); border-radius: 10px; border: 3px solid transparent; background-clip: content-box; }
        .scroll::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,.65); background-clip: content-box; border: 3px solid transparent; }
        .content-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
        .content-head h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
        .content-head span { color: var(--text-2); }
        .hint { margin: 0 0 12px; color: var(--text-2); font-size: 13px; }
        .hint kbd {
            font: inherit; font-size: 12px; padding: 1px 6px; border-radius: 5px;
            background: var(--field); border: 0.5px solid var(--line);
        }

        #gallery { contain: layout; display: grid; grid-template-columns: repeat(auto-fill, minmax(236px, 1fr)); gap: 14px; }
        .card {
            content-visibility: auto; contain-intrinsic-size: 130px;
            background: var(--card); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 14px;
            box-shadow: 0 0 0 0.5px var(--line), 0 1px 2px rgba(0,0,0,0.06);
        }
        .card-top { display: flex; align-items: center; gap: 12px; }
        .app-icon {
            width: 46px; height: 46px; border-radius: 11px; display: grid; place-items: center; flex: none;
            color: #fff; font-size: 20px; box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.18);
        }
        .card-name { font-weight: 600; font-size: 14px; line-height: 1.25; overflow-wrap: anywhere; }
        .card-cat { color: var(--text-2); font-size: 12px; }
        .card-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; }
        .get {
            flex: 1; min-width: 0; text-align: center; text-decoration: none; cursor: grab;
            padding: 6px 12px; border-radius: 999px; font-weight: 600; font-size: 13px;
            background: var(--sel); color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            transition: background-color .15s, color .15s;
        }
        .get:hover { background: var(--accent); color: #fff; }
        .get:active { cursor: grabbing; background: var(--accent-press); color: #fff; }
        .icon-btn {
            width: 30px; height: 30px; border: 0; border-radius: 8px; background: var(--field);
            color: var(--text-2); cursor: default; display: grid; place-items: center; font-size: 12px;
        }
        .icon-btn:hover { color: var(--text); background: var(--line); }

        #emptyState { text-align: center; padding: 70px 0; color: var(--text-2); }
        #emptyState i { font-size: 38px; color: var(--text-3); margin-bottom: 10px; }
        #emptyState h3 { margin: 0; font-weight: 600; font-size: 15px; color: var(--text); }
        .hidden, [hidden] { display: none !important; }
        .foot { flex: none; padding: 12px 26px; border-top: 1px solid var(--line); color: var(--text-2); font-size: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .foot a { color: var(--accent); text-decoration: none; }
        .foot a:hover { text-decoration: underline; }

        #codeModal {
            position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px;
            background: rgba(0,0,0,0.45);
        }
        #modalContent {
            width: 100%; max-width: 860px; max-height: 84vh; display: flex; flex-direction: column; overflow: hidden;
            border-radius: 12px; background: var(--code-bg); box-shadow: var(--shadow-win);
            transform: scale(.97); opacity: 0; transition: transform .18s ease, opacity .18s ease;
        }
        #modalContent.open { transform: none; opacity: 1; }
        .m-bar {
            display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; height: 44px; padding: 0 14px;
            background: rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        #modalTitle { color: #d1d1d6; font-size: 13px; font-weight: 600; max-width: 46vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .m-body { overflow: auto; padding: 18px 20px; flex: 1; }
        #modalCode {
            margin: 0; color: var(--code-text); white-space: pre-wrap; word-break: break-word;
            font: 12.5px/1.6 "SF Mono", ui-monospace, Menlo, Consolas, monospace;
        }
        .m-foot { display: flex; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); }
        .btn-primary {
            border: 0; border-radius: 8px; padding: 6px 16px; background: var(--accent); color: #fff; font-weight: 600; cursor: default;
            display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary:hover { background: var(--accent-press); }

        :root { --spring: cubic-bezier(.34,1.56,.64,1); }
        .window { transform-origin: 50% 100%; transition: transform .5s var(--spring), opacity .3s, max-width .4s ease, border-radius .3s; }
        .window.min { transform: translateY(75vh) scale(.1); opacity: 0; pointer-events: none; }
        .window.wide { max-width: 100%; }
        body { transition: padding .4s ease; } body.full { padding: 0; } body.full .window { border-radius: 0; }
        .window.nope { animation: nope .45s ease; }
        @keyframes nope { 20%,60% { transform: translateX(-9px); } 40%,80% { transform: translateX(9px); } }

        .dot { display: grid; place-items: center; appearance: none; cursor: default; }
        .dot::after { content: attr(data-g); font-size: 9px; line-height: 1; font-weight: 800; color: rgba(0,0,0,.6); opacity: 0; transition: opacity .1s; }
        .lights:hover .dot::after { opacity: 1; }

        .card { content-visibility: auto; contain-intrinsic-size: 130px; transition: transform .35s var(--spring), box-shadow .25s; }
        .card:hover { transform: translateY(-4px) rotate(-.4deg); box-shadow: 0 0 0 0.5px var(--line), 0 12px 24px rgba(0,0,0,.16); }
        .app-icon { transition: transform .4s var(--spring); }
        .card:hover .app-icon { transform: scale(1.1); }
        .card.pop { animation: pop .5s var(--spring) backwards; animation-delay: calc(var(--i) * 30ms); }
        @keyframes pop { from { opacity: 0; transform: translateY(16px) scale(.93); } }
        .card[data-fx="1"].pop { animation-name: popL; }
        .card[data-fx="2"].pop { animation-name: popR; }
        .card[data-fx="3"].pop { animation-name: popDrop; }
        .card[data-fx="4"].pop { animation-name: popZoom; }
        .card[data-fx="5"].pop { animation-name: popFlip; }
        .card[data-fx="6"].pop { animation-name: popSwing; }
        .card[data-fx="7"].pop { animation-name: popJelly; animation-timing-function: ease-out; }
        @keyframes popL { from { opacity: 0; transform: translateX(-46px); } }
        @keyframes popR { from { opacity: 0; transform: translateX(46px); } }
        @keyframes popDrop { from { opacity: 0; transform: translateY(-46px) rotate(-4deg); } }
        @keyframes popZoom { from { opacity: 0; transform: scale(.55); } }
        @keyframes popFlip { from { opacity: 0; transform-origin: 50% 0; transform: perspective(600px) rotateX(-75deg); } to { transform-origin: 50% 0; } }
        @keyframes popSwing { from { opacity: 0; transform-origin: 0 0; transform: rotate(-9deg) translateY(24px); } to { transform-origin: 0 0; } }
        @keyframes popJelly { 0% { opacity: 0; transform: scale(.5,1.4); } 60% { opacity: 1; transform: scale(1.07,.94); } 100% { transform: none; } }

        .card[data-fx="0"]:hover { transform: translateY(-5px) rotate(-.6deg); }
        .card[data-fx="1"]:hover { transform: translate(5px,-2px); }
        .card[data-fx="2"]:hover { transform: scale(1.035); }
        .card[data-fx="3"]:hover { transform: translateY(-6px) rotate(.9deg); }
        .card[data-fx="4"]:hover { transform: translateY(-3px) scale(1.02); }
        .card[data-fx="5"]:hover { transform: perspective(700px) rotateY(5deg) translateY(-3px); }
        .card[data-fx="6"]:hover { transform: rotate(1.2deg) translateY(-4px); }
        .card[data-fx="7"]:hover { transform: scale(1.03,1.05) translateY(-3px); }
        .card[data-fx="0"]:hover .app-icon { animation: iWob .6s; }
        .card[data-fx="1"]:hover .app-icon { animation: iBounce .6s; }
        .card[data-fx="2"]:hover .app-icon { animation: iSpin .7s; }
        .card[data-fx="3"]:hover .app-icon { animation: iShake .5s; }
        .card[data-fx="4"]:hover .app-icon { animation: iPulse .5s; }
        .card[data-fx="5"]:hover .app-icon { animation: iFlip .7s; }
        .card[data-fx="6"]:hover .app-icon { animation: iSwing .7s; }
        .card[data-fx="7"]:hover .app-icon { animation: iJelly .6s; }
        @keyframes iWob { 25% { transform: rotate(-14deg); } 50% { transform: rotate(10deg); } 75% { transform: rotate(-5deg); } to { transform: scale(1.1); } }
        @keyframes iBounce { 30% { transform: translateY(-11px); } 55% { transform: translateY(0); } 75% { transform: translateY(-4px); } to { transform: scale(1.1); } }
        @keyframes iSpin { to { transform: rotate(360deg) scale(1.1); } }
        @keyframes iShake { 20%,60% { transform: translateX(-5px); } 40%,80% { transform: translateX(5px); } to { transform: scale(1.1); } }
        @keyframes iPulse { 50% { transform: scale(1.35); } to { transform: scale(1.1); } }
        @keyframes iFlip { to { transform: perspective(200px) rotateY(360deg) scale(1.1); } }
        @keyframes iSwing { 30% { transform: rotate(16deg); } 60% { transform: rotate(-10deg); } to { transform: scale(1.1); } }
        @keyframes iJelly { 30% { transform: scale(1.3,.8); } 60% { transform: scale(.88,1.2); } to { transform: scale(1.1); } }
        .confetti.dots { width: 8px; height: 8px; border-radius: 50%; }
        .confetti.sparks { width: 3px; height: 14px; rotate: var(--a); }
        .confetti.emoji { width: auto; height: auto; font-size: 18px; line-height: 1; font-style: normal; background: none !important; }
        .get { transition: transform .25s var(--spring), background-color .15s, color .15s; }
        .get:hover { transform: scale(1.04); }
        .get:active { transform: scale(.95); }
        .get.wiggle { animation: wiggle .5s ease; }
        @keyframes wiggle { 20% { transform: rotate(-5deg) scale(1.05); } 50% { transform: rotate(5deg) scale(1.05); } 80% { transform: rotate(-3deg); } }
        .icon-btn { transition: transform .25s var(--spring), background-color .15s, color .15s; }
        .icon-btn:hover { transform: scale(1.15); } .icon-btn:active { transform: scale(.88); }
        .cat-filter .ico { transition: transform .35s var(--spring); }
        .cat-filter:hover .ico { transform: scale(1.18) rotate(-6deg); } .cat-filter:active .ico { transform: scale(.85); }
        #emptyState i { display: inline-block; animation: wob 2.2s ease-in-out infinite; }
        @keyframes wob { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg) translateY(-4px); } }

        #dropbar {
            position: fixed; top: 0; left: 0; right: 0; height: 48px; z-index: 60; display: flex; align-items: center; justify-content: center; gap: 10px;
            background: var(--accent); color: #fff; font-weight: 600; pointer-events: none;
            transform: translateY(-100%); transition: transform .4s var(--spring);
        }
        body.dragging #dropbar { transform: none; }
        #dropbar i { animation: nudge .7s ease-in-out infinite; }
        @keyframes nudge { 50% { transform: translateY(-6px); } }
        #toast {
            position: fixed; left: 50%; bottom: 26px; z-index: 70; padding: 9px 18px; border-radius: 999px; pointer-events: none;
            background: var(--text); color: var(--win); font-weight: 600; font-size: 13px; box-shadow: 0 6px 20px rgba(0,0,0,.3);
            transform: translate(-50%, 70px); opacity: 0; transition: transform .45s var(--spring), opacity .2s;
        }
        #toast.show { transform: translate(-50%, 0); opacity: 1; }
        .dock {
            position: fixed; left: 50%; bottom: 16px; z-index: 40; width: 58px; height: 58px; border: 0; border-radius: 15px; cursor: default;
            display: grid; place-items: center; color: #fff; font-size: 24px; background: linear-gradient(#42a5ff, #0a6cf0);
            box-shadow: 0 8px 20px rgba(0,0,0,.3); transform: translate(-50%, 110px); opacity: 0; pointer-events: none;
            transition: transform .5s var(--spring), opacity .25s;
        }
        .dock.show { transform: translate(-50%, 0); opacity: 1; pointer-events: auto; animation: hop 1.1s .5s ease-in-out 3; }
        @keyframes hop { 40% { transform: translate(-50%, -20px); } }
        .confetti { position: fixed; z-index: 80; width: 8px; height: 5px; border-radius: 2px; pointer-events: none; animation: fly .9s cubic-bezier(.2,.7,.4,1) forwards; }
        @keyframes fly { to { transform: translate(var(--dx), calc(var(--dy) + 110px)) rotate(var(--r)); opacity: 0; } }

        .tb-right { justify-self: end; display: flex; align-items: center; gap: 8px; width: 100%; max-width: 280px; }
        .tb-right .search { justify-self: auto; flex: 1; min-width: 0; }
        .wall-btn { flex: none; width: 28px; height: 28px; border: 0; border-radius: 8px; background: var(--field); color: var(--text-2); display: grid; place-items: center; cursor: default; transition: transform .3s var(--spring), color .15s; }
        .wall-btn:hover { color: var(--text); transform: rotate(-12deg) scale(1.12); }
        .wall-btn:active { transform: scale(.88); }
        @media (max-width: 800px) {
            body { padding: 0; }
            .window { border-radius: 0; }
            .titlebar { grid-template-columns: auto 1fr; gap: 12px; }
            .win-title { display: none; }
            .search { max-width: none; } .tb-right { max-width: none; }
            .layout { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); } .sidebar { min-width: 0; }
            .sidebar { border-right: 0; border-bottom: 1px solid var(--line); padding: 10px; overflow-y: visible; }
            .side-label { display: none; }
            #categoryFilters { flex-direction: row; overflow-x: auto; gap: 6px; padding-bottom: 2px; }
            .cat-filter { width: auto; white-space: nowrap; background: var(--field); padding: 5px 12px; border-radius: 999px; }
            .cat-filter .count { display: none; }
            .content { padding: 14px 0 0; } .content-head, .hint { padding: 0 16px; } .scroll { padding: 8px 16px 22px; }
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } .confetti { display: none; } }
    """

    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <title>Bookmarklet Studio</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Cdefs%3E%3ClinearGradient%20id='g'%20x1='8'%20y1='4'%20x2='56'%20y2='60'%20gradientUnits='userSpaceOnUse'%3E%3Cstop%20offset='0'%20stop-color='%2342a5ff'/%3E%3Cstop%20offset='.55'%20stop-color='%230a84ff'/%3E%3Cstop%20offset='1'%20stop-color='%230a6cf0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='64'%20height='64'%20rx='15'%20fill='url(%23g)'/%3E%3Cpath%20d='M23%2013H41Q44%2013%2044%2016V51L32%2041.5%2020%2051V16Q20%2013%2023%2013Z'%20fill='%23fff'/%3E%3Cpath%20d='M32%2013H41Q44%2013%2044%2016V51L32%2041.5Z'%20fill='%230a84ff'%20fill-opacity='.2'/%3E%3C/svg%3E">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>{style_css}</style>
</head>
<body>
    <div class="window">
        <div class="titlebar">
            <div class="lights"><button class="dot r" id="btnClose" data-g="&times;" aria-label="Close"></button><button class="dot y" id="btnMin" data-g="&minus;" aria-label="Minimize"></button><button class="dot g" id="btnMax" data-g="+" aria-label="Zoom"></button></div>
            <div class="win-title"><i class="fas fa-bookmark"></i> Bookmarklet Studio</div>
            <div class="tb-right"><button class="wall-btn" id="wallBtn" title="Change wallpaper" aria-label="Change wallpaper"><i class="fas fa-image"></i></button>
            <label class="search">
                <i class="fas fa-search"></i>
                <input type="search" id="searchInput" placeholder="Search  ( / )" autocomplete="off" aria-label="Search bookmarklets">
            </label></div>
        </div>

        <div class="layout">
            <nav class="sidebar" aria-label="Categories">
                <div class="side-label">Library</div>
                <div id="categoryFilters">
                    <button class="cat-filter active" data-category="all"><span class="ico" style="background:linear-gradient(#42a5ff,#0a6cf0)"><i class="fas fa-layer-group"></i></span><span class="nm">All Bookmarklets</span><span class="count"></span></button>
                    {filters}
                </div>
            </nav>

            <main class="content">
                <div class="content-head"><h1 id="viewTitle">All Bookmarklets</h1><span id="viewCount"></span></div>
                <p class="hint">Drag a button to your bookmarks bar to install it. Press <kbd>Ctrl/Cmd</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> to show the bar.</p>
                <div class="scroll" id="scroller">
                <div id="gallery"></div>
                <div id="emptyState" class="hidden">
                    <div><i class="fas fa-folder-open"></i></div>
                    <h3>Hmm, nothing matches</h3>
                    <p>Try another word, or press Esc to clear.</p>
                </div>
                </div>
            </main>
        </div>

        <div class="foot">
            <span>Last synced {last_updated}</span>
            <a href="https://github.com/NotNahid/bookmarklet" target="_blank" rel="noopener">View source on GitHub</a>
        </div>
    </div>

    <div id="dropbar"><i class="fas fa-arrow-up"></i> Drop it on your bookmarks bar</div>
    <div id="toast" role="status" aria-live="polite"></div>
    <button id="dock" class="dock" aria-label="Restore Bookmarklet Studio"><i class="fas fa-bookmark"></i></button>

    <div id="codeModal" class="hidden" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div id="modalContent">
            <div class="m-bar">
                <div class="lights"><button class="dot r" onclick="closeModal()" data-g="&times;" aria-label="Close"></button><span class="dot y"></span><span class="dot g"></span></div>
                <h3 id="modalTitle" style="margin:0">Script.js</h3>
                <span></span>
            </div>
            <div class="m-body"><pre id="modalCode"></pre></div>
            <div class="m-foot"><button id="copyModalBtn" class="btn-primary"><i class="fas fa-copy"></i> Copy Source</button></div>
        </div>
    </div>

    <script>
        const scripts = {scripts_json};
        const searchInput = document.getElementById('searchInput');
        const gallery = document.getElementById('gallery');
        const emptyState = document.getElementById('emptyState');
        const viewTitle = document.getElementById('viewTitle');
        const viewCount = document.getElementById('viewCount');
        const filters = document.querySelectorAll('.cat-filter');
        let activeCategory = 'all';

        const ICONS = {
            'General': 'fa-solid fa-wand-magic-sparkles', 'Facebook': 'fa-brands fa-facebook-f',
            'Instagram': 'fa-brands fa-instagram', 'YouTube': 'fa-brands fa-youtube', 'Github': 'fa-brands fa-github',
            'Pinterest': 'fa-brands fa-pinterest-p', 'Slack': 'fa-brands fa-slack', 'Medium': 'fa-brands fa-medium',
            'CRM': 'fa-solid fa-address-book', 'Daraz': 'fa-solid fa-bag-shopping', 'OSINT': 'fa-solid fa-magnifying-glass',
            'Web in General': 'fa-solid fa-globe', 'Webpage': 'fa-solid fa-window-maximize', 'Outside': 'fa-solid fa-arrow-up-right-from-square'
        };
        const TINTS = {
            'Facebook': ['#4aa3ff', '#1877f2'], 'Instagram': ['#ff8a5c', '#d62976'], 'YouTube': ['#ff6b6b', '#e0001b'],
            'Github': ['#6e7681', '#24292f'], 'Pinterest': ['#ff5a6e', '#e60023'], 'Slack': ['#9b6bff', '#4a154b'],
            'Medium': ['#6b6b70', '#1d1d1f'], 'General': ['#8e8e93', '#636366']
        };
        function tintFor(name) {
            if (TINTS[name]) return TINTS[name];
            let h = 0;
            for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
            return ['hsl(' + h + ',80%,62%)', 'hsl(' + h + ',75%,48%)'];
        }
        function iconFor(name) { return ICONS[name] || 'fa-solid fa-bolt'; }
        function gradFor(name) { const t = tintFor(name); return 'linear-gradient(' + t[0] + ',' + t[1] + ')'; }
        function esc(s) {
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // sidebar icons + counts
        filters.forEach(f => {
            const cat = f.getAttribute('data-category');
            const n = cat === 'all' ? scripts.length : scripts.filter(s => s.category === cat).length;
            f.querySelector('.count').textContent = n;
            if (cat !== 'all') {
                const ico = f.querySelector('.ico');
                ico.style.background = gradFor(cat);
                ico.innerHTML = '<i class="' + iconFor(cat) + '"></i>';
            }
        });

        // build every card once (no giant hrefs in the DOM until needed)
        const cards = scripts.map((script, idx) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.fx = (idx * 5 + 3) % 8;   // 5 is coprime with 8, so neighbours never match
            card.innerHTML = `
                <div class="card-top">
                    <div class="app-icon" style="background:${gradFor(script.category)}"><i class="${iconFor(script.category)}"></i></div>
                    <div>
                        <div class="card-name">${esc(script.name)}</div>
                        <div class="card-cat">${esc(script.category)}</div>
                    </div>
                </div>
                <div class="card-actions">
                    <a class="get" href="#" data-id="${script.id}" onclick="return false;" title="Drag to your bookmarks bar" draggable="true">${esc(script.name)}</a>
                    <button class="icon-btn" onclick="showCode('${script.id}')" title="View Source" aria-label="View source"><i class="fas fa-code"></i></button>
                    <button class="icon-btn" onclick="copyToClipboard('${script.id}', event)" title="Copy Source" aria-label="Copy source"><i class="fas fa-copy"></i></button>
                </div>`;
            gallery.appendChild(card);
            return { script, card, hay: (script.name + ' ' + script.category).toLowerCase() };
        });

        // attach the real javascript: URL only when the user is about to drag it
        function armLink(e) {
            const a = e.target.closest && e.target.closest('a.get');
            if (!a || a.dataset.armed) return;
            const s = scripts.find(x => x.id === a.dataset.id);
            if (s) { a.href = s.bookmarklet; a.dataset.armed = '1'; }
        }
        ['pointerover', 'pointerdown', 'focusin', 'touchstart', 'dragstart'].forEach(ev => gallery.addEventListener(ev, armLink, { passive: true }));

        const scroller = document.getElementById('scroller');
        scroller.addEventListener('scroll', () => scroller.classList.toggle('scrolled', scroller.scrollTop > 2), { passive: true });
        function renderGallery(pop) {
            scroller.scrollTop = 0;
            const term = searchInput.value.toLowerCase().trim();
            let count = 0;
            const shownNow = [];
            for (const c of cards) {
                const show = (activeCategory === 'all' || c.script.category === activeCategory) && c.hay.includes(term);
                if (show !== c.shown) { c.card.hidden = !show; c.shown = show; }
                if (show) { count++; shownNow.push(c.card); }
            }
            if (pop) {
                shownNow.forEach(el => el.classList.remove('pop'));
                void gallery.offsetWidth;
                shownNow.forEach((el, i) => { el.style.setProperty('--i', Math.min(i, 14)); el.classList.add('pop'); });
            }
            viewCount.textContent = count + (count === 1 ? ' item' : ' items');
            emptyState.classList.toggle('hidden', count !== 0);
        }

        let t; searchInput.addEventListener('input', () => { clearTimeout(t); t = setTimeout(renderGallery, 80); });

        function updateFilters() {
            filters.forEach(f => {
                const on = f.getAttribute('data-category') === activeCategory;
                f.classList.toggle('active', on);
                if (on) { f.setAttribute('aria-current', 'true'); viewTitle.textContent = f.querySelector('.nm').textContent; }
                else f.removeAttribute('aria-current');
            });
        }
        filters.forEach(filter => {
            filter.addEventListener('click', () => {
                activeCategory = filter.getAttribute('data-category');
                updateFilters();
                renderGallery(true);
            });
        });

        const modal = document.getElementById('codeModal');
        const modalContent = document.getElementById('modalContent');
        const modalTitle = document.getElementById('modalTitle');
        const modalCode = document.getElementById('modalCode');
        const copyModalBtn = document.getElementById('copyModalBtn');

        function showCode(id) {
            const script = scripts.find(s => s.id === id);
            modalTitle.textContent = script.name + '.js';
            modalCode.textContent = script.code;
            modal.classList.remove('hidden');
            requestAnimationFrame(() => modalContent.classList.add('open'));
            copyModalBtn.onclick = (e) => copyToClipboard(id, e);
        }
        function closeModal() {
            modalContent.classList.remove('open');
            setTimeout(() => modal.classList.add('hidden'), 180);
        }
        function copyToClipboard(id, event) {
            const script = scripts.find(s => s.id === id);
            const btn = event.target.closest('button');
            navigator.clipboard.writeText(script.code).then(() => {
                const r = btn.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); toast(pick(['Copied to clipboard', 'Snatched 📋', 'Copied. Go paste something', 'Got it ✂️']));
                const original = btn.innerHTML;
                btn.innerHTML = btn.id === 'copyModalBtn' ? '<i class="fas fa-check"></i> Copied' : '<i class="fas fa-check"></i>';
                setTimeout(() => { btn.innerHTML = original; }, 1800);
            });
        }
        // ---- fun stuff ----
        const toastEl = document.getElementById('toast');
        let toastT;
        function toast(msg) {
            toastEl.textContent = msg; toastEl.classList.add('show');
            clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2400);
        }
        const pick = arr => arr[Math.floor(Math.random() * arr.length)];
        function burst(x, y) {
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const mode = pick(['confetti', 'dots', 'emoji', 'sparks']);
            const cols = ['#ff9f0a', '#ff453a', '#30d158', '#0a84ff', '#ffd60a', '#ff6482'];
            const emojis = ['🎉', '✨', '🔖', '⭐', '🚀', '🎈', '🔥'];
            const n = mode === 'emoji' ? 9 : 18;
            for (let i = 0; i < n; i++) {
                const p = document.createElement('i'); p.className = 'confetti ' + mode;
                const ang = mode === 'sparks' ? (i / n) * Math.PI * 2 : Math.random() * Math.PI * 2;
                const d = (mode === 'sparks' ? 70 : 50) + Math.random() * 80;
                if (mode === 'emoji') p.textContent = pick(emojis);
                const rot = mode === 'sparks' ? 0 : Math.random() * 720 - 360;
                const lift = mode === 'sparks' ? 0 : -40;
                p.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % cols.length]};--a:${ang + Math.PI / 2}rad;--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d + lift}px;--r:${rot}deg`;
                p.addEventListener('animationend', () => p.remove());
                document.body.appendChild(p);
            }
        }

        // wallpaper switcher (remembers your pick)
        const WALLS = [['tahoe', 'Tahoe (default)'], ['bright', 'Bright'], ['hills', 'Hills 🌄']];
        function setWall(name, say) {
            document.body.dataset.wall = name;
            try { localStorage.setItem('studio-wall', name); } catch (e) {}
            if (say) toast('Wallpaper: ' + WALLS.find(w => w[0] === name)[1]);
        }
        let savedWall = 'tahoe';
        try { savedWall = localStorage.getItem('studio-wall') || 'tahoe'; } catch (e) {}
        setWall(WALLS.some(w => w[0] === savedWall) ? savedWall : 'tahoe', false);
        document.getElementById('wallBtn').onclick = () => {
            const i = WALLS.findIndex(w => w[0] === document.body.dataset.wall);
            setWall(WALLS[(i + 1) % WALLS.length][0], true);
        };

        // traffic lights actually do things
        const win = document.querySelector('.window'), dock = document.getElementById('dock');
        document.getElementById('btnMin').onclick = () => { win.classList.add('min'); dock.classList.add('show'); };
        dock.onclick = () => { win.classList.remove('min'); dock.classList.remove('show'); };
        document.getElementById('btnMax').onclick = () => { win.classList.toggle('wide'); document.body.classList.toggle('full'); };
        document.getElementById('btnClose').onclick = () => {
            win.classList.remove('nope'); void win.offsetWidth; win.classList.add('nope');
            toast(pick(['Nice try 😄 this window is staying put', 'Nope, you need me here', 'Closing is overrated', 'Not today 🙅']));
        };
        win.addEventListener('animationend', (e) => { if (e.animationName === 'nope') win.classList.remove('nope'); });

        // dragging a bookmarklet: banner slides in, confetti when you let go
        gallery.addEventListener('dragstart', (e) => {
            if (e.target.closest && e.target.closest('a.get')) setTimeout(() => document.body.classList.add('dragging'), 0);
        });
        gallery.addEventListener('dragend', (e) => {
            document.body.classList.remove('dragging');
            const a = e.target.closest && e.target.closest('a.get');
            if (a) { burst(e.clientX, e.clientY); toast(pick(['Check your bookmarks bar 🔖', 'Nice one! Look up there ⬆️', 'Saved? Look at your bar 👀', 'Grabbed it 🎯'])); }
        });
        // clicking instead of dragging gets a friendly nudge
        gallery.addEventListener('click', (e) => {
            const a = e.target.closest && e.target.closest('a.get');
            if (!a) return;
            a.classList.remove('wiggle'); void a.offsetWidth; a.classList.add('wiggle');
            toast(pick(["Don't click, drag me to your bookmarks bar!", 'Ow! Drag me, do not poke me', 'Wrong move: drag me up there ⬆️', 'I am a drag, not a click 😎']));
        });
        document.addEventListener('keydown', (e) => {
            const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
            if (e.key === '/' && !typing) { e.preventDefault(); searchInput.focus(); }
            else if (e.key === 'Escape' && document.activeElement === searchInput) { searchInput.value = ''; searchInput.blur(); renderGallery(); }
        });

        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

        updateFilters();
        renderGallery(true);
    </script>
</body>
</html>
    """

    filters_html = ""
    for cat in cat_names:
        c = html.escape(cat, quote=True)
        filters_html += f'<button class="cat-filter" data-category="{c}"><span class="ico"></span><span class="nm">{c}</span><span class="count"></span></button>\n'

    flat_scripts = []
    for cat in cat_names:
        for script in categories[cat]:
            script_id = f"s{len(flat_scripts)}"
            flat_scripts.append({
                'id': script_id,
                'name': script['name'],
                'category': cat,
                'code': script['code'],
                'bookmarklet': script['bookmarklet']
            })
            
    # </script> or <!-- inside a script would terminate the inline <script>; escape < > & and U+2028/9
    safe_json = (json.dumps(flat_scripts)
                 .replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
                 .replace('\u2028', '\\u2028').replace('\u2029', '\\u2029'))
    parts = {'{style_css}': style_css, '{filters}': filters_html,
             '{last_updated}': last_updated, '{scripts_json}': safe_json}
    # single pass so tokens that appear inside script source are never touched
    final_html = re.sub('|'.join(re.escape(k) for k in parts), lambda m: parts[m.group(0)], html_template)

    return final_html

if __name__ == "__main__":
    # If running inside the repo, base_dir is '.'
    # If running outside (local watcher), it might be 'bookmarklet_repo'
    base_dir = '.' if os.path.exists('README.md') and not os.path.exists('bookmarklet_repo') else 'bookmarklet_repo'
    
    # Check if we are inside the repo already (common for GitHub Actions)
    if os.path.exists('.git') and not os.path.exists('bookmarklet_repo'):
        base_dir = '.'

    scripts_data = get_scripts(base_dir)
    if scripts_data:
        html_content = generate_html(scripts_data)
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Gallery updated successfully at {datetime.now().strftime('%H:%M:%S')}")
    else:
        print("No scripts found. Gallery not updated.")
