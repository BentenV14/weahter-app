const html = await (await fetch('https://openfreemap.org/quick_start/')).text();
console.log([...new Set(html.match(/https:\/\/tiles.openfreemap.org\/styles\/[a-z0-9_-]+/g))]);
for (const style of ['dark', 'dark-matter', 'positron', 'liberty']) {
  const response = await fetch(`https://tiles.openfreemap.org/styles/${style}`);
  console.log(style, response.status, (await response.text()).slice(0, 160));
}
