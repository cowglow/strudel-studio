// Impressum and privacy pages: show the German or the English version.
// Order: a #de / #en link, the visitor's earlier choice, the browser's language list
// (set from the OS by default), the system locale, then English.

type Lang = 'de' | 'en'
const KEY = 'legal-lang'

const toLang = (value?: string | null): Lang | undefined => {
  const v = value?.toLowerCase() ?? ''
  if (v.startsWith('de')) return 'de'
  if (v.startsWith('en')) return 'en'
}

// storage can be blocked (private windows, strict settings); the page works without it
function saved(): Lang | undefined {
  try {
    return toLang(localStorage.getItem(KEY))
  } catch {
    return undefined
  }
}

function save(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // not remembered, still shown
  }
}

function preferred(): Lang {
  const candidates = [
    location.hash.slice(1),
    saved(),
    ...(navigator.languages ?? [navigator.language]),
    Intl.DateTimeFormat().resolvedOptions().locale,
  ]
  for (const c of candidates) {
    const lang = toLang(c)
    if (lang) return lang
  }
  return 'en'
}

const sections = [...document.querySelectorAll<HTMLElement>('.legal .lang')]
const buttons = [...document.querySelectorAll<HTMLButtonElement>('.lang-switch [data-lang]')]
const site = document.title.split(' · ').slice(1).join(' · ')

function show(lang: Lang) {
  for (const section of sections) section.hidden = section.lang !== lang
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.lang === lang))
  document.documentElement.lang = lang
  const heading = sections.find((s) => s.lang === lang)?.querySelector('h1')?.textContent
  if (heading) document.title = `${heading} · ${site}`
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    const lang = toLang(button.dataset.lang)
    if (!lang) return
    save(lang)
    show(lang)
    // drop a #de / #en from the address so it doesn't override the choice on reload
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  })
}

// a #de / #en link to the page that's already open only changes the hash
window.addEventListener('hashchange', () => {
  const lang = toLang(location.hash.slice(1))
  if (lang) show(lang)
})

if (sections.length) {
  show(preferred())
  document.querySelector<HTMLElement>('.lang-switch')!.hidden = false
}
