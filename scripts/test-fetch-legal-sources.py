import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('fetch_sources', Path(__file__).with_name('fetch-legal-sources.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SourceTests(unittest.TestCase):
    def test_extract_main_and_ignore_active_content(self):
        parser = module.PageText()
        parser.feed('<nav>Navigation</nav><main><h1>Rights</h1><p>A &amp; B</p><script>bad()</script><div hidden>hidden</div></main><footer>Footer</footer>')
        self.assertEqual(parser.text(), 'Rights\nA & B')
    def test_generic_portals_are_not_law(self):
        self.assertEqual(module.fetch({'title':'Portal','url':'https://example.com/'})['status'], 'needs-specific-url')
    def test_local_source_skips_download_and_checks_presence(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            original = module.KNOWLEDGE
            module.KNOWLEDGE = Path(directory).resolve()
            try:
                (module.KNOWLEDGE / 'code.txt').write_text('Local code')
                entry = {'title': 'Code', 'url': 'https://example.com/', 'local_file': 'code.txt'}
                self.assertEqual(module.fetch(entry)['status'], 'supplied-locally')
                entry['local_file'] = 'missing.txt'
                self.assertEqual(module.fetch(entry)['status'], 'failed')
                entry['local_file'] = '../outside.txt'
                self.assertEqual(module.fetch(entry)['status'], 'failed')
            finally:
                module.KNOWLEDGE = original

    def test_reject_non_https_and_credentials(self):
        for url in ['file:///etc/passwd','http://example.com/test','https://user:pass@example.com/test']:
            with self.assertRaises(ValueError): module.validate_url(url)

if __name__ == '__main__': unittest.main()
