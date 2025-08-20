async function search(q){
  const r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`);
  return r.json();
}
async function getOffers(pid){
  const r = await fetch(`${API}/api/products/${pid}/prices`);
  return r.json();
}
function formatTL(n){
  return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n);
}
document.getElementById('btn').addEventListener('click', async ()=>{
  const q = document.getElementById('q').value.trim();
  const res = await search(q);
  const list = document.getElementById('results');
  list.innerHTML = '';
  if(!res.products?.length){
    list.innerHTML = '<p>Sonuç bulunamadı.</p>';
    return;
  }
  const tpl = document.getElementById('product-row').content;
  res.products.forEach(p=>{
    const node = tpl.cloneNode(true);
    node.querySelector('.thumb').src = p.thumbnail || '';
    node.querySelector('.name').textContent = p.name;
    const best = p.best_total_price;
    node.querySelector('.best').textContent = best
      ? `${best.site} • Ürün: ${formatTL(best.price)} • Kargo: ${formatTL(best.shipping_fee)} • Toplam: ${formatTL(best.total)} • ${best.delivery_eta_days} gün`
      : 'Teklif yok';
    const offersBox = node.querySelector('.offers');
    node.querySelector('.see-offers').addEventListener('click', async ()=>{
      if(!offersBox.classList.contains('hidden')){
        offersBox.classList.add('hidden'); offersBox.innerHTML=''; return;
      }
      const {offers} = await getOffers(p.id);
      if(!offers?.length){ offersBox.textContent='Teklif bulunamadı.'; offersBox.classList.remove('hidden'); return; }
      offersBox.innerHTML = `
        <div class="offer" style="font-weight:700">
          <div>Site</div><div>Ürün</div><div>Kargo</div><div>Toplam</div><div>Teslimat / Link</div>
        </div>`;
      offers.forEach(o=>{
        const row = document.createElement('div');
        row.className='offer';
        row.innerHTML = `
          <div>${o.site}</div>
          <div>${formatTL(o.price)}</div>
          <div>${formatTL(o.shipping_fee||0)}</div>
          <div>${formatTL(o.total)}</div>
          <div>${o.delivery_eta_days} gün • <a href="${o.url}" target="_blank">Git ve Satın Al</a></div>`;
        offersBox.appendChild(row);
      });
      offersBox.classList.remove('hidden');
    });
    list.appendChild(node);
  });
});
