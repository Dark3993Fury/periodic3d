// Fetch + cache the static JSON files in public/data/.
// BASE_URL makes the paths work on GitHub Pages (/periodic3d/).

const cache = new Map();

export function loadJSON(name) {
  if (!cache.has(name)) {
    const url = `${import.meta.env.BASE_URL}data/${name}`;
    const request = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        cache.delete(name); // allow a retry later
        throw err;
      });
    cache.set(name, request);
  }
  return cache.get(name);
}

/** elements.json is required; spectra and timeline are optional extras. */
export async function loadAll() {
  const [elements, spectra, timeline] = await Promise.all([
    loadJSON('elements.json'),
    loadJSON('spectra.json').catch(() => ({})),
    loadJSON('timeline.json').catch(() => null),
  ]);
  return { elements, spectra, timeline };
}
