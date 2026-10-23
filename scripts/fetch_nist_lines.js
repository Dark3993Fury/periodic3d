// Paste into the browser console on https://physics.nist.gov/PhysRefData/ASD/lines_form.html
// (the shell cannot reach NIST, so this runs in a normal browser tab).
// It queries neutral-atom lines 380-750 nm for Z = 1..99, keeps the 15 strongest observed
// lines per element (intensity relative to that element's strongest), and downloads
// nist_visible_lines.json. Put that file in scripts/raw/ and run `npm run data`.
const SYMS = 'H,He,Li,Be,B,C,N,O,F,Ne,Na,Mg,Al,Si,P,S,Cl,Ar,K,Ca,Sc,Ti,V,Cr,Mn,Fe,Co,Ni,Cu,Zn,Ga,Ge,As,Se,Br,Kr,Rb,Sr,Y,Zr,Nb,Mo,Tc,Ru,Rh,Pd,Ag,Cd,In,Sn,Sb,Te,I,Xe,Cs,Ba,La,Ce,Pr,Nd,Pm,Sm,Eu,Gd,Tb,Dy,Ho,Er,Tm,Yb,Lu,Hf,Ta,W,Re,Os,Ir,Pt,Au,Hg,Tl,Pb,Bi,Po,At,Rn,Fr,Ra,Ac,Th,Pa,U,Np,Pu,Am,Cm,Bk,Cf,Es'.split(',');

function asdUrl(spectrum) {
  const form = document.querySelector('form');
  const fd = new FormData(form);
  fd.set('spectra', spectrum);
  fd.set('low_w', '380');
  fd.set('upp_w', '750');
  fd.set('format', '3'); // tab-delimited
  fd.delete('bibrefs');
  fd.delete('unc_out');
  fd.set('submit', 'Retrieve Data');
  return form.action + '?' + new URLSearchParams(fd).toString();
}

function parseAsd(txt) {
  if (!txt.startsWith('obs_wl')) return [];
  const out = [];
  for (const row of txt.trim().split('\n').slice(1)) {
    const c = row.split('\t').map((s) => s.replace(/"/g, '').trim());
    const wl = parseFloat(c[0]);                 // observed wavelength only
    const m = (c[2] || '').match(/[\d.]+/);       // intensity, strip flags like "bl"
    const I = m ? parseFloat(m[0]) : NaN;
    if (isFinite(wl) && isFinite(I) && I > 0 && wl >= 380 && wl <= 750) out.push([wl, I]);
  }
  return out;
}

const SPEC = {};
for (let i = 0; i < SYMS.length; i++) {
  const lines = parseAsd(await fetch(asdUrl(SYMS[i] + ' I')).then((r) => r.text()));
  if (lines.length) {
    lines.sort((a, b) => b[1] - a[1]);
    const top = lines.slice(0, 15);
    const max = top[0][1];
    SPEC[i + 1] = {
      ion: 'I',
      n: lines.length,
      lines: top.sort((a, b) => a[0] - b[0])
        .map(([w, I]) => [Math.round(w * 100) / 100, Math.round((I / max) * 100) / 100]),
    };
  }
  await new Promise((r) => setTimeout(r, 300)); // be polite to NIST
}
const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([JSON.stringify(SPEC)], { type: 'application/json' }));
a.download = 'nist_visible_lines.json';
a.click();
