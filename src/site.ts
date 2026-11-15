// shared by every public page

// the studio only exists on the dev server, so its link only appears there;
// `vite build` drops this block entirely
if (import.meta.env.DEV) {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.href = '/studio/'
  link.className = 'bevel'
  link.textContent = 'Studio'
  item.append(link)
  document.querySelector('.site-header ul')?.append(item)
}

// mark the current page in the navigation (styled as a pressed button)
for (const link of document.querySelectorAll<HTMLAnchorElement>('.site-header nav a')) {
  if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current', 'page')
}
