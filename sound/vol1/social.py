"""Absolute production URLs and consistent social previews for all nine pages."""
from html import escape
import re
from pathlib import Path
from magazine import EDITORIAL

BASE = 'https://ml-yoyohuang.github.io/artworks/sound/vol1/'


def cards(works):
    result = [{'id':'index', 'page':'index.html', 'title':'聲音成為物質',
               'subtitle':'聽見之後，留下什麼？', 'en':'AN EXHIBITION IN EIGHT MOVEMENTS',
               'description':'八個房間，八種時間。讓聲音形成建築、纖維、切口與記憶的生成藝術選集。',
               'preview':'assets/hybrid1/previews/01-resonant-architecture.webp'}]
    for i,w in enumerate(works):
        en,subtitle,description,_=EDITORIAL[i]
        source='hybrid1' if w.get('variant')=='hybrid' else w['source']
        ext='webp' if w['source']=='test1' else 'jpg'
        result.append({'id':w['id'], 'page':w['page'], 'title':w['title'],
                       'subtitle':subtitle, 'en':en.upper(), 'description':description,
                       'preview':f'assets/{source}/previews/{Path(w["page"]).stem}.{ext}'})
    return result


def add_social(content, card):
    content=re.sub(r'<meta\b[^>]*(?:property|name)=["\'](?:og:|twitter:)[^>]*>','',content,flags=re.I)
    content=re.sub(r'<link\b[^>]*rel=["\']canonical["\'][^>]*>','',content,flags=re.I)
    content=re.sub(r'(?m)^[ \t]+$', '', content)
    url=BASE if card['id']=='index' else BASE+card['page']
    image=BASE+f'assets/og/{card["id"]}.jpg'
    title=f'{card["title"]}｜SOUND / VOL. 1'
    tags=[f'<link rel="canonical" href="{url}">']
    values={'og:type':'website','og:locale':'zh_TW','og:site_name':'SOUND / VOL. 1 聲音選集',
            'og:title':title,'og:description':card['description'],'og:url':url,
            'og:image':image,'og:image:secure_url':image,'og:image:type':'image/jpeg',
            'og:image:width':'1200','og:image:height':'630',
            'og:image:alt':f'{card["title"]} — {card["subtitle"]}'}
    tags.extend(f'<meta property="{k}" content="{escape(v,quote=True)}">' for k,v in values.items())
    twitter={'twitter:card':'summary_large_image','twitter:title':title,
             'twitter:description':card['description'],'twitter:image':image,
             'twitter:image:alt':values['og:image:alt']}
    tags.extend(f'<meta name="{k}" content="{escape(v,quote=True)}">' for k,v in twitter.items())
    return content.replace('</head>','\n'+'\n'.join(tags)+'\n</head>')
