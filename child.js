'use strict'

console.log('[child] booting...')

setInterval(() => {}, 1000000000)

process.on('SIGINT', () => {
  console.log('[child] received SIGINT!')
  const start = Date.now()
  console.log('[child] waiting 25ms...')
  while (Date.now() < start + 25);
  console.log('[child] 25ms has passed! -- exiting...')
  process.exit()
})
