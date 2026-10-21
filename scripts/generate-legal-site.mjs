import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  LEGAL_EFFECTIVE_DATE_LABEL,
  createAccountDeletionSections,
  createPrivacyPolicySections,
  createTermsOfUseSections,
} = require('../packages/shared/dist/index.js');

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(repositoryRoot, 'hosting');

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable pública ${name}`);
  return value;
}

function requiredEmail(name) {
  const value = requiredEnvironment(name);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} debe contener un correo válido`);
  }
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderSections(sections) {
  return sections
    .map((section) => {
      const paragraphs = (section.paragraphs ?? [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('\n');
      const bullets = section.bullets?.length
        ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('\n')}</ul>`
        : '';
      return `<section><h2>${escapeHtml(section.title)}</h2>${paragraphs}${bullets}</section>`;
    })
    .join('\n');
}

function renderPage({ title, subtitle, sections, contactEmail }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(subtitle)}">
    <title>${escapeHtml(title)} | ColectiGO</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">ColectiGO</a>
      <nav aria-label="Documentos legales">
        <a href="/privacidad/">Privacidad</a>
        <a href="/terminos/">Términos</a>
        <a href="/eliminar-cuenta/">Eliminar cuenta</a>
      </nav>
    </header>
    <main>
      <div class="hero">
        <p class="eyebrow">Información legal</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <p class="updated">Actualizado: ${escapeHtml(LEGAL_EFFECTIVE_DATE_LABEL)}</p>
      </div>
      ${renderSections(sections)}
      <a class="contact" href="mailto:${escapeHtml(contactEmail)}">Contactar: ${escapeHtml(contactEmail)}</a>
    </main>
    <footer>ColectiGO · Huancayo, Perú</footer>
  </body>
</html>`;
}

async function writeOutput(relativePath, contents) {
  const target = join(outputDirectory, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
}

const legalConfig = {
  responsibleName: requiredEnvironment('EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME'),
  privacyEmail: requiredEmail('EXPO_PUBLIC_PRIVACY_EMAIL'),
  supportEmail: requiredEmail('EXPO_PUBLIC_SUPPORT_EMAIL'),
  audienceLabel: '18+',
};

await Promise.all([
  writeOutput(
    'index.html',
    renderPage({
      title: 'Información legal',
      subtitle: 'Documentos públicos de ColectiGO',
      sections: [
        {
          title: 'Documentos disponibles',
          paragraphs: [
            'Consulta la Política de privacidad, los Términos de uso y las instrucciones para eliminar una cuenta de ColectiGO desde el menú superior.',
          ],
        },
      ],
      contactEmail: legalConfig.supportEmail,
    }),
  ),
  writeOutput(
    'privacidad/index.html',
    renderPage({
      title: 'Política de privacidad',
      subtitle: 'Cómo tratamos tus datos',
      sections: createPrivacyPolicySections(legalConfig),
      contactEmail: legalConfig.privacyEmail,
    }),
  ),
  writeOutput(
    'terminos/index.html',
    renderPage({
      title: 'Términos de uso',
      subtitle: 'Condiciones del servicio',
      sections: createTermsOfUseSections(legalConfig),
      contactEmail: legalConfig.supportEmail,
    }),
  ),
  writeOutput(
    'eliminar-cuenta/index.html',
    renderPage({
      title: 'Eliminación de cuenta',
      subtitle: 'Cómo solicitar que eliminemos tu cuenta y sus datos asociados',
      sections: createAccountDeletionSections(legalConfig),
      contactEmail: legalConfig.privacyEmail,
    }),
  ),
  writeOutput(
    '404.html',
    renderPage({
      title: 'Página no encontrada',
      subtitle: 'El documento solicitado no existe',
      sections: [
        {
          title: 'Volver a los documentos legales',
          paragraphs: ['Usa el menú superior para abrir la información legal disponible.'],
        },
      ],
      contactEmail: legalConfig.supportEmail,
    }),
  ),
  writeOutput(
    'styles.css',
    `:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
  background: #f8fafc;
}
* { box-sizing: border-box; }
body { margin: 0; line-height: 1.65; }
a { color: #1d4ed8; }
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem max(1rem, calc((100% - 58rem) / 2));
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}
.brand { color: #0f172a; font-size: 1.2rem; font-weight: 800; text-decoration: none; }
nav { display: flex; flex-wrap: wrap; gap: .85rem; }
nav a { font-size: .92rem; font-weight: 650; text-decoration: none; }
main { width: min(58rem, calc(100% - 2rem)); margin: 2rem auto 4rem; }
.hero { padding: 1rem 0; }
.eyebrow { color: #1d4ed8; font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: .2rem 0; font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.12; }
.updated { color: #64748b; font-size: .9rem; }
section { margin-top: 1rem; padding: 1.25rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem; }
h2 { margin: 0 0 .65rem; font-size: 1.18rem; line-height: 1.35; }
p { margin: .5rem 0; }
ul { margin: .5rem 0; padding-left: 1.4rem; }
li + li { margin-top: .45rem; }
.contact { display: inline-block; margin-top: 1.25rem; padding: .75rem 1rem; color: #ffffff; background: #1d4ed8; border-radius: .75rem; font-weight: 700; text-decoration: none; }
footer { padding: 1.5rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
@media (max-width: 42rem) {
  .site-header { align-items: flex-start; flex-direction: column; }
  nav { gap: .55rem 1rem; }
}
`,
  ),
]);

console.log(`Sitio legal generado en ${outputDirectory}`);
