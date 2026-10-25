"""Fetch explicit catalog URLs; do not crawl links or replace original records."""
import concurrent.futures
import datetime
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import sys
import urllib.request
from urllib.parse import urlparse
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE = Path(os.environ.get('RAG_KNOWLEDGE_PATH', ROOT / 'src/legal_knowlege')).resolve()
MAX_BYTES = 25 * 1024 * 1024

class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.all = []
        self.main = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        blocked = tag in ('script', 'style', 'nav', 'header', 'footer', 'noscript', 'svg', 'form') or 'hidden' in attrs or attrs.get('aria-hidden') == 'true'
        primary = tag in ('main', 'article') or attrs.get('role') == 'main' or attrs.get('id') in ('codecontent', 'content', 'main-content')
        if tag not in ('br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'embed', 'param', 'track', 'col'):
            self.stack.append((tag, blocked, primary))
        if tag in ('p', 'div', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'section', 'tr'):
            self.handle_data('\n')
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
        if tag in ('p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'section', 'tr'):
            self.handle_data('\n')
    def handle_data(self, data):
        if any(item[1] for item in self.stack): return
        self.all.append(data)
        if any(item[2] for item in self.stack): self.main.append(data)
    def text(self):
        raw = ''.join(self.main or self.all)
        return '\n'.join(line for line in (re.sub(r'\s+', ' ', line).strip() for line in raw.splitlines()) if line)

def validate_url(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('Only public HTTPS source URLs are allowed')
    for addr in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(addr[4][0]).is_global:
            raise ValueError('Private network sources are not allowed')
    return url

class PublicRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(entry):
    url = entry['url']
    result = {'title': entry['title'], 'url': url}
    if entry.get('local_file'):
        local = (KNOWLEDGE / entry['local_file']).resolve()
        if not local.is_relative_to(KNOWLEDGE) or not local.is_file():
            return {**result, 'status': 'failed', 'error': 'Configured local source is missing or outside the knowledge folder'}
        return {**result, 'status': 'supplied-locally', 'file': entry['local_file']}
    # Root pages and code overviews are catalogs, not the full source documents.
    if urlparse(url).path in ('', '/') or urlparse(url).path.endswith('/overview'):
        return {**result, 'status': 'needs-specific-url'}
    try:
        validate_url(url)
        request = urllib.request.Request(url, headers={'User-Agent': 'EvictWise-SourceImporter/1.0', 'Accept': 'text/html,application/pdf,text/plain'})
        with urllib.request.build_opener(PublicRedirects()).open(request, timeout=25) as response:
            final = response.url
            kind = response.headers.get_content_type()
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES: raise ValueError('Source exceeds 25 MB')
            if kind == 'application/pdf' or data.startswith(b'%PDF-'):
                extension = '.pdf'
            else:
                if kind not in ('text/html', 'text/plain', 'application/xhtml+xml'): raise ValueError('Unsupported content type')
                text = data.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')
                if kind != 'text/plain':
                    parser = PageText(); parser.feed(text); text = parser.text()
                if len(text) < 500 or re.search(r'just a moment|verify you are human|access denied|enable javascript and cookies|page not found|request access|programmatic access to these sites is limited', text[:1500], re.I):
                    raise ValueError('Blocked, missing, or insufficient source text')
                data = text.encode('utf-8'); extension = '.txt'
        target = KNOWLEDGE / 'imported' / (hashlib.sha256(url.encode()).hexdigest()[:20] + extension)
        metadata = {**result, 'resolved_url': final, 'retrieved_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'effective_date': None, 'jurisdiction': entry.get('jurisdiction', 'See source'), 'sha256': hashlib.sha256(data).hexdigest()}
        metadata_path = target.with_suffix(target.suffix + '.source.json')
        if metadata_path.exists():
            previous = json.loads(metadata_path.read_text())
            if previous.get('sha256') == metadata['sha256'] and previous.get('resolved_url') == final:
                metadata['retrieved_at'] = previous['retrieved_at']
        if not target.parent.resolve().is_relative_to(KNOWLEDGE):
            raise ValueError('Imported directory must stay within knowledge folder')
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix('.tmp'); temporary.write_bytes(data); temporary.replace(target)
        temporary_metadata = target.with_suffix('.metadata.tmp')
        temporary_metadata.write_text(json.dumps(metadata, indent=2) + '\n')
        temporary_metadata.replace(metadata_path)
        # A URL can switch from HTML to PDF; never retain the old text alongside it.
        other = target.with_suffix('.pdf' if extension == '.txt' else '.txt')
        other.unlink(missing_ok=True)
        other.with_suffix(other.suffix + '.source.json').unlink(missing_ok=True)
        return {**result, 'status': 'downloaded', 'file': str(target.relative_to(KNOWLEDGE)), 'bytes': len(data)}
    except Exception as error:
        return {**result, 'status': 'failed', 'error': str(error)}

def main():
    entries = json.loads((KNOWLEDGE / 'manifest.json').read_text())
    for entry in entries:
        catalog = (KNOWLEDGE / entry['path']).resolve()
        if not catalog.is_relative_to(KNOWLEDGE):
            raise ValueError('Catalog path is outside knowledge folder')
        if catalog.exists():
            match = re.search(r'^jurisdiction:\s*"?([^\n"]+)', catalog.read_text(), re.M)
            if match: entry['jurisdiction'] = match.group(1)
    overrides = ROOT / 'server/rag/source-links.json'
    entries.extend(json.loads(overrides.read_text()) if overrides.exists() else [])
    unique = {}
    for item in entries:
        previous = unique.get(item['url'])
        if previous is None or item.get('local_file'):
            unique[item['url']] = item
    entries = list(unique.values())
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(fetch, entries))
    report = ROOT / 'server/private/source-import-report.json'
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(results, indent=2) + '\n')
    for item in results: print(f"{item['status']}: {item['title']}" + (f" — {item['error']}" if 'error' in item else ''))
    print(json.dumps({status: sum(r['status'] == status for r in results) for status in ['downloaded', 'supplied-locally', 'needs-specific-url', 'failed']}))
    print(f'Report: {report}')
    if any(item['status'] == 'failed' for item in results): sys.exit(1)

if __name__ == '__main__': main()
