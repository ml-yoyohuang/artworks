"""A common editorial shell around each original artwork's functional DOM."""
from html import escape
from html.parser import HTMLParser
from magazine import EDITORIAL

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag, attrs=(), children=None):
        self.tag, self.attrs, self.children = tag, dict(attrs), children or []

    def find(self, *, tag=None, cls=None, id=None):
        if ((tag is None or self.tag == tag) and
                (cls is None or cls in self.attrs.get('class', '').split()) and
                (id is None or self.attrs.get('id') == id)):
            return self
        for child in self.children:
            if isinstance(child, Node):
                found = child.find(tag=tag, cls=cls, id=id)
                if found is not None:
                    return found
        return None

    def remove(self, node):
        if node in self.children:
            self.children.remove(node)
            return True
        return any(c.remove(node) for c in self.children if isinstance(c, Node))

    def render(self):
        if self.tag == 'root':
            return ''.join(render(c) for c in self.children)
        attrs = ''.join(f' {k}' if v is None else f' {k}="{escape(v, quote=True)}"' for k, v in self.attrs.items())
        start = f'<{self.tag}{attrs}>'
        return start if self.tag in VOID else start + ''.join(render(c) for c in self.children) + f'</{self.tag}>'


def render(node):
    return node.render() if isinstance(node, Node) else node


class DOM(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def handle_entityref(self, name):
        self.handle_data(f'&{name};')

    def handle_charref(self, name):
        self.handle_data(f'&#{name};')


def unify_page(content, work, works, position):
    root = DOM(content).root
    head, body = root.find(tag='head'), root.find(tag='body')
    en, subtitle, invitation, materials = EDITORIAL[position]
    previous, following = works[(position-1) % 8], works[(position+1) % 8]
    # Shared typography/colors are the same stylesheet as the index.
    head.children = [c for c in head.children if not (isinstance(c, Node) and c.tag == 'link' and c.attrs.get('rel') == 'stylesheet')]
    for child in head.children:
        if isinstance(child, Node) and child.tag == 'meta' and child.attrs.get('name') == 'theme-color':
            child.attrs['content'] = '#f4f1e9'
    head.children.extend([Node('link', [('rel','stylesheet'), ('href','assets/css/volume.css')]),
                          Node('link', [('rel','stylesheet'), ('href','assets/css/work.css')])])
    body.attrs['class'] = 'volume-work'
    body.attrs.pop('style', None)
    stage = root.find(cls='stage')
    title_overlay = stage.find(cls='title-block')
    if title_overlay is not None:
        stage.remove(title_overlay)
    controls = root.find(cls='controls')
    special, interaction = controls.find(cls='special'), root.find(cls='interaction')
    if special is not None:
        controls.remove(special)
    transport = controls.find(cls='transport')
    if transport is None:
        transport = Node('div', [('class','transport')], controls.children[:])
    export = special.find(id='export') if special is not None else None
    if export is not None:
        special.remove(export)
        transport.children.append(export)
    controls.attrs.update(id='controls', **{'class':'controls', 'aria-label':'播放控制'})
    controls.children = [transport]
    notice = root.find(id='notice')
    if notice is not None:
        notice.children = ['按下開始聆聽，或親手操作，讓聲音慢慢形成。']
    how = root.find(cls='how-to-play')
    original_notes = root.find(cls='notes')
    if how is not None:
        how.find(tag='summary').children = ['玩法與觀看', Node('span', [('lang','en')], ['HOW TO PLAY'])]
        technology = root.find(cls='technology')
        technical = render(technology)
        statement = invitation
    else:
        cols = original_notes.find(cls='cols')
        sections = [c for c in cols.children if isinstance(c, Node) and c.tag == 'section']
        viewing = next(c for c in sections if '如何觀看' in c.render())
        how = Node('details', [('class','how-to-play')], [
            Node('summary', children=['玩法與觀看', Node('span', [('lang','en')], ['HOW TO PLAY'])]),
            Node('div', [('class','play-guide')], viewing.children[1:])])
        technical = ''.join(render(c) for c in sections if c is not viewing)
        statement = original_notes.find(cls='statement').render()
    if not statement.startswith('<'):
        statement = f'<p class="statement">{statement}</p>'
    sources = [work['source']]
    if work.get('audio_source') and work['audio_source'] not in sources:
        sources.append(work['audio_source'])
    credits = ' · '.join(f'<a href="MUSIC_CREDITS-{s}.md">音源與授權{f" {i+1}" if len(sources)>1 else ""}</a>' for i,s in enumerate(sources))
    modules = ''.join(render(c) for c in body.children if isinstance(c, Node) and c.tag == 'script')
    creation = (render(special) if special is not None else '') + (render(interaction) if interaction is not None else '')
    soundtrack = root.find(cls='soundtrack-choice')
    body.children = [f'''
<a class="skip-link" href="#controls">跳到播放控制</a>
<header class="masthead"><a class="brand" href="index.html">SOUND / VOL. 1 <span>聲音選集</span></a><nav aria-label="作品導覽"><a href="index.html">作品目錄</a><a href="{following['page']}">下一件 →</a></nav></header>
<main>
  <section class="volume-heading"><div><p class="section-label">{work['id']} / 08 <span lang="en">{en.upper()}</span></p><h1>{escape(work['title'])}</h1><p class="volume-subtitle">《{subtitle}》</p></div><p class="heading-description">{invitation}</p></section>
  <div class="stage-rule"><span>{materials}</span><span lang="en">SOUND IN MOTION</span></div>
  {stage.render()}
  <section class="control-panel" aria-label="聆聽與創作"><div class="control-heading"><span>聆聽與創作</span><span lang="en">LISTEN &amp; EXPLORE</span></div>{controls.render()}
    <div class="creation-controls">{creation}</div>
    {render(soundtrack) if soundtrack is not None else ''}
    {render(notice) if notice is not None else ''}
  </section>
  <section class="work-notes" aria-label="作品說明"><div class="work-essay"><p class="section-label" lang="en">ABOUT THIS MOVEMENT</p><h2>{subtitle}</h2>{statement}</div><div class="work-guides">{how.render()}<details class="technical-notes"><summary>生成與聲音 <span lang="en">SOUND &amp; MATERIAL</span></summary><div class="technical-content">{technical}</div></details><p class="credit-links">{credits}</p></div></section>
</main>
<footer class="work-footer"><nav class="work-pagination" aria-label="作品間導覽"><a href="{previous['page']}" rel="prev"><span>← 上一件 / {previous['id']}</span><strong>{previous['title']}</strong></a><a class="directory-link" href="index.html">返回作品目錄</a><a href="{following['page']}" rel="next"><span>下一件 / {following['id']} →</span><strong>{following['title']}</strong></a></nav><div class="work-colophon"><span class="brand">SOUND / VOL. 1</span><span>聲音成為物質 / 2026</span></div></footer>
{modules}
''']
    return '<!doctype html>\n<html lang="zh-Hant">' + head.render() + '\n' + body.render() + '\n</html>\n'
