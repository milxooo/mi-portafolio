"""Pruebas de comportamiento de security-check.py (solo stdlib)."""
import importlib.util
import os
import subprocess
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('sc', os.path.join(HERE, 'security-check.py'))
sc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sc)

GOOD_HTML = ('<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'">'
             '<meta name="referrer" content="no-referrer"></head><body>'
             '<a href="https://x.dev" target="_blank" rel="noopener noreferrer">x</a></body></html>')
GOOD_JS = ("function isSafeUrl(u){return true}\nfunction escapeHTML(s){return s}\n"
           "a.rel = 'noopener noreferrer';\nel.innerHTML = escapeHTML(x);\n")


def make_site(tmp, **over):
    files = {'index.html': GOOD_HTML, '404.html': GOOD_HTML, 'js/main.js': GOOD_JS,
             'data/proyectos.js': 'window.x = [];\n', 'data/certificaciones.js': 'window.y = [];\n'}
    files.update(over)
    for rel, text in files.items():
        p = os.path.join(tmp, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(text)


def git(tmp, *args):
    subprocess.run(['git', '-C', tmp, *args], check=True, capture_output=True)


class SecurityCheckTests(unittest.TestCase):
    def setUp(self):
        self._t = tempfile.TemporaryDirectory()
        self.tmp = self._t.name

    def tearDown(self):
        self._t.cleanup()

    def test_clean_site_passes_everything(self):
        make_site(self.tmp)
        for _, fn in sc.CHECKS:
            self.assertEqual(fn(self.tmp)[0], [], fn.__name__)

    def test_external_link_without_noopener_fails(self):
        make_site(self.tmp, **{'index.html': GOOD_HTML.replace('rel="noopener noreferrer"', '')})
        self.assertTrue(sc.check_external_links(self.tmp)[0])

    def test_frame_ancestors_in_meta_fails(self):
        bad = GOOD_HTML.replace("default-src 'self'", "default-src 'self'; frame-ancestors 'none'")
        make_site(self.tmp, **{'index.html': bad})
        self.assertTrue(sc.check_meta_policies(self.tmp)[0])

    def test_secret_in_tracked_file_fails(self):
        make_site(self.tmp, **{'notes.txt': 'api_key = "abcdefghijklmnop1234"\n'})
        self.assertTrue(any('secreto' in e for e in sc.check_sensitive_files(self.tmp)[0]))

    def test_tracked_vscode_fails(self):
        make_site(self.tmp, **{'.vscode/launch.json': '{}'})
        git(self.tmp, 'init', '-q')
        git(self.tmp, 'add', '-A')
        self.assertTrue(any('.vscode' in e for e in sc.check_sensitive_files(self.tmp)[0]))

    def test_untracked_ignored_vscode_only_warns(self):
        make_site(self.tmp, **{'.vscode/launch.json': '{}', '.gitignore': '.vscode/\n'})
        git(self.tmp, 'init', '-q')
        git(self.tmp, 'add', '-A')
        errors, warnings = sc.check_sensitive_files(self.tmp)
        self.assertEqual(errors, [])
        self.assertTrue(any('.vscode' in w for w in warnings))

    def test_untracked_unignored_vscode_fails(self):
        make_site(self.tmp, **{'.vscode/launch.json': '{}'})
        git(self.tmp, 'init', '-q')
        git(self.tmp, 'add', 'index.html')
        self.assertTrue(any('no esta ignorado' in e for e in sc.check_sensitive_files(self.tmp)[0]))

    def test_non_http_url_in_data_fails(self):
        make_site(self.tmp, **{'data/proyectos.js': 'window.x = [{"repo": "javascript:alert(1)"}];\n'})
        self.assertTrue(sc.check_data_files(self.tmp)[0])

    def test_final_message_is_not_overclaiming(self):
        make_site(self.tmp)
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            self.assertEqual(sc.main(self.tmp), 0)
        self.assertNotIn('100%', buf.getvalue())
        self.assertIn('controles basicos aprobados', buf.getvalue())

    def test_real_repo_passes(self):
        for _, fn in sc.CHECKS:
            self.assertEqual(fn(sc.ROOT_DIR)[0], [], fn.__name__)


if __name__ == '__main__':
    unittest.main()
