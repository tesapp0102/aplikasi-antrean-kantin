(()=>{
"use strict";
const $=i=>document.getElementById(i);
const rp=n=>"Rp"+Math.round(n).toLocaleString("id-ID");
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=v=>parseInt(String(v).replace(/\D/g,""),10)||0;
const store=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};
const STL={menunggu:"Diterima",dimasak:"Dimasak",siap:"Siap diambil",selesai:"Selesai",batal:"Dibatalkan"};
const STEP=[["menunggu","🧾","Diterima"],["dimasak","🔥","Dimasak"],["siap","✅","Siap"],["selesai","🎉","Selesai"]];
const EMO={A:"🍛",B:"🍜",C:"🥤"};
const emo=o=>/^[?\s]*$/.test(o.emoji||"")?(EMO[o.kode]||"🍽️"):emo(o);
const stanImg=s=>"ABC".includes(s.kode)?`<img class="eg" src="img/stan-${s.kode.toLowerCase()}.svg" alt="">`:`<span class="em">${emo(s)}</span>`;
let U=null,stans=[],cur=null,cart={},myIds=store("ak-ids")||[],my={},view="pesan",dStan=0,kat="Semua",lastKat="",lastMenunggu=-1,editM=null,editS=null,foto=null,met="Bayar di kantin",busy=false,tiktok=0;

function toast(t){const e=$("toast");e.textContent=t;e.className="toast on";clearTimeout(toast.t);toast.t=setTimeout(()=>e.className="toast",2400)}
function beep(){try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.setValueAtTime(.25,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.7);o.start();o.stop(c.currentTime+.7)}catch(e){}if(navigator.vibrate)navigator.vibrate([200,100,200])}
function api(a,body,qs){
  const o=body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{};
  return fetch("api.php?aksi="+a+(qs||""),o).then(r=>{if(r.status===401){setStaff(null);showLogin()}return r.json()}).then(j=>{if(j.error)throw new Error(j.error);return j});
}
const mins=t=>Math.max(0,Math.round((Date.now()-t)/60000));
const stanById=id=>stans.find(s=>s.id===id);
const tile=(m,c)=>`<div class="im" style="--c:${esc(c)}">${m.foto?`<img src="${esc(m.foto)}" alt="">`:emo(m)}</div>`;
const sid=()=>U?(U.role==="admin"?(dStan||(view==="laporan"?0:(stans[0]||{}).id)):U.stan_id):0;
const empty=(t,s)=>`<div class="empty"><svg width="90" height="70" viewBox="0 0 90 70" aria-hidden="true"><rect x="10" y="30" width="70" height="34" rx="8" fill="var(--soft)"/><path d="M6 30 16 10h58l10 20z" fill="var(--pri)" opacity=".85"/><circle cx="45" cy="47" r="9" fill="var(--acc)"/></svg><b>${t}</b><br>${s||""}</div>`;

/* ---------- navigasi ---------- */
function setView(v){
  view=v;lastMenunggu=-1;
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("on",s.id===v));
  document.querySelectorAll("#nav button").forEach(b=>b.setAttribute("aria-selected",b.dataset.v===v));
  $("staffBar").hidden=!(U&&U.role==="admin"&&["dapur","menu","laporan"].includes(v));
  if(v!=="laporan"&&!dStan&&stans[0])dStan=stans[0].id;fillSel();
  if(v==="pesan")renderPesan();if(v==="menu")renderMenuStaf();
  cartBar();tick();window.scrollTo(0,0);
}
function tick(){
  ({pesan:loadKatalog,saya:()=>pollSaya(false),layar:loadLayar,dapur:loadDapur,menu:loadKatalog,laporan:loadLaporan}[view]||(()=>{}))();
}
setInterval(()=>{if(document.hidden)return;tick();if(view!=="saya")pollSaya(true)},5000);

/* ---------- murid: katalog & pesan ---------- */
function loadKatalog(){
  return api("katalog").then(j=>{
    const k=JSON.stringify(j.stans);if(k===lastKat)return;lastKat=k;stans=j.stans;
    if(cur)cur=stanById(cur.id)||null;
    if(!dStan&&stans[0])dStan=stans[0].id;fillSel();
    if(view==="pesan")renderPesan();if(view==="menu")renderMenuStaf();
  }).catch(e=>{$("stanList").innerHTML=empty("Tidak bisa terhubung ke server",esc(e.message))});
}
function renderPesan(){
  $("stanList").hidden=!!cur;$("menuWrap").hidden=!cur;cartBar();
  if(!cur){
    $("stanList").innerHTML=`<div class="top"><h2>Mau makan di mana?</h2></div><div class="sgrid">`+stans.map(s=>`<button class="stan${s.buka?"":" tutup"}" style="--c:${esc(s.warna)}" data-s="${s.id}">${stanImg(s)}<b>${esc(s.nama)}</b><span>${s.menu.filter(m=>m.tersedia).length} menu tersedia</span><span class="pill">${s.buka?(s.antre?s.antre+" pesanan antre":"Tidak antre"):"Tutup"}</span></button>`).join("")+`</div>`;
    return;
  }
  const ks=["Semua",...new Set(cur.menu.map(m=>m.kategori))];
  $("menuWrap").innerHTML=`<div class="sb"><button class="back" id="back">&larr; Kantin</button><h2>${emo(cur)} ${esc(cur.nama)}</h2></div>
  <div class="chips">${ks.map(k=>`<button class="chip${k===kat?" on":""}" data-k="${esc(k)}">${esc(k)}</button>`).join("")}</div><div class="mgrid">`+
  cur.menu.filter(m=>kat==="Semua"||m.kategori===kat).map(m=>{
    const q=cart[m.id]||0,ok=m.tersedia&&cur.buka;
    return `<div class="m${ok?"":" habis"}">${tile(m,cur.warna)}<span class="n">${esc(m.nama)}</span><span class="h">${rp(m.harga)}</span><span class="w">&#9201; ~${m.waktu} menit</span>`+
    (!ok?`<button class="add" disabled>${cur.buka?"Habis":"Tutup"}</button>`:q?`<div class="qty"><button data-d="${m.id}" aria-label="Kurangi">&minus;</button><i>${q}</i><button data-a="${m.id}" aria-label="Tambah">+</button></div>`:`<button class="add" data-a="${m.id}">Tambah</button>`)+`</div>`}).join("")+`</div>`;
}
const cartN=()=>Object.values(cart).reduce((a,b)=>a+b,0);
const cartItems=()=>cur?cur.menu.filter(m=>cart[m.id]).map(m=>({m,q:cart[m.id]})):[];
const cartTot=()=>cartItems().reduce((a,x)=>a+x.m.harga*x.q,0);
function cartBar(){const n=view==="pesan"&&cur?cartN():0;$("cbar").hidden=!n;if(n){$("cN").textContent=n+" item";$("cT").textContent="Lanjut pesan "+rp(cartTot())}}
function addC(id){cart[id]=Math.min(20,(cart[id]||0)+1);renderPesan()}
function subC(id){if(cart[id]>1)cart[id]--;else delete cart[id];renderPesan();if(!cartN())$("ovCo").classList.remove("on")}
function openCo(){
  const p=store("ak-prof")||{};$("cNama").value=p.nama||"";$("cKelas").value=p.kelas||"";$("cCat").value="";renderCo();$("ovCo").classList.add("on");
}
function renderCo(){
  $("coLines").innerHTML=cartItems().map(x=>`<div class="cl"><div class="th" style="--c:${esc(cur.warna)}">${x.m.foto?`<img src="${esc(x.m.foto)}" alt="">`:emo(x.m)}</div><div class="t"><b>${esc(x.m.nama)}</b><span>${rp(x.m.harga)}</span></div><div class="qty"><button data-d="${x.m.id}">&minus;</button><i>${x.q}</i><button data-a="${x.m.id}">+</button></div></div>`).join("");
  $("coTot").textContent=rp(cartTot());
}
function pesan(){
  const nama=$("cNama").value.trim();if(!nama){toast("Isi namamu dulu ya");return}
  if(busy)return;busy=true;$("coGo").disabled=true;
  const kelas=$("cKelas").value.trim();store("ak-prof",{nama,kelas});
  api("pesan",{stan_id:cur.id,nama,kelas,catatan:$("cCat").value.trim(),metode:met,items:cartItems().map(x=>({id:x.m.id,q:x.q}))}).then(t=>{
    myIds.unshift(t.id);myIds=myIds.slice(0,15);store("ak-ids",myIds);my[t.id]=t.status;cart={};
    $("ovCo").classList.remove("on");$("tiket").innerHTML=tiketHTML(t,true);$("ovTiket").classList.add("on");renderPesan();badge([t]);
  }).catch(e=>toast(e.message)).then(()=>{busy=false;$("coGo").disabled=false});
}
function infoLine(t){
  if(t.status==="siap")return `<div class="info ok">Pesananmu siap! Ambil di ${esc(t.stan)} sekarang.</div>`;
  if(t.status==="dimasak")return `<div class="info">Sedang dimasak, sekitar ${t.est} menit lagi.</div>`;
  if(t.status==="menunggu")return `<div class="info">${t.ahead?t.ahead+" pesanan di depanmu":"Kamu antrean berikutnya"} &bull; estimasi ~${t.est} menit</div>`;
  return "";
}
function tiketHTML(t,baru){
  const idx=STEP.findIndex(s=>s[0]===t.status);
  return `<div class="tk ${t.status}"><div class="hd" style="--c:${esc(t.warna)}"><span style="font-size:34px">${emo({emoji:t.semoji,kode:t.kode.charAt(0)})}</span><div><span class="code">${t.kode}</span><small>${esc(t.stan)}</small></div><span class="st">${STL[t.status]}</span></div><div class="bd">`+
  (baru?`<div class="info ok">Pesanan diterima! Tunjukkan kode ${t.kode} saat mengambil.</div>`:"")+
  (t.status==="batal"?"":`<div class="steps">${STEP.map((s,i)=>`<div class="${i<=idx?"d":""}${i===idx&&i<3?" now":""}"><b>${s[1]}</b>${s[2]}</div>`).join("")}</div>`)+
  infoLine(t)+`<div style="margin:8px 0 4px;color:var(--mute);font-size:13px">${esc(t.nama)} &middot; ${esc(t.kelas||"-")} &middot; ${mins(t.t)} mnt lalu</div>`+
  t.items.map(i=>`<div class="li"><span>${i.q}&times; ${esc(i.n)}</span><span>${rp(i.h*i.q)}</span></div>`).join("")+
  `<div class="li" style="margin-top:6px"><b>Total (${esc(t.metode)})</b><b>${rp(t.total)}</b></div>`+
  (t.catatan?`<div class="note">&#128221; ${esc(t.catatan)}</div>`:"")+
  (t.status==="menunggu"&&!baru?`<button class="link" data-bt="${t.id}">Batalkan pesanan</button>`:"")+`</div></div>`;
}
function badge(list){
  const n=list.filter(t=>t.status==="menunggu"||t.status==="dimasak"||t.status==="siap").length;
  $("badge").hidden=!n;$("badge").textContent=n;
}
function pollSaya(silent){
  if(!myIds.length){if(view==="saya")$("myList").innerHTML=empty("Belum ada pesanan","Pilih kantin dulu di menu Pesan.");return Promise.resolve()}
  return api("status",null,"&ids="+myIds.join(",")).then(j=>{
    j.pesanan.forEach(t=>{if(my[t.id]&&my[t.id]!==t.status&&t.status==="siap"){beep();toast("Pesanan "+t.kode+" siap diambil!")}my[t.id]=t.status});
    badge(j.pesanan);
    if(view==="saya")$("myList").innerHTML=`<div class="top"><h2>Antrean saya</h2></div>`+(j.pesanan.length?j.pesanan.map(t=>tiketHTML(t)).join(""):empty("Belum ada pesanan"));
  }).catch(e=>{if(!silent)toast(e.message)});
}

/* ---------- layar antrean ---------- */
function loadLayar(){
  api("layar").then(j=>{
    $("board").innerHTML=j.stans.map(s=>`<div class="bd2"><div class="hh" style="--c:${esc(s.warna)}">${emo(s)} ${esc(s.nama)}${s.buka?"":" (tutup)"}</div><div class="cols"><div><h4>Dimasak</h4><div class="nums">${s.dimasak.map(k=>`<span>${k}</span>`).join("")||'<small style="color:var(--mute)">-</small>'}</div></div><div><h4>Siap diambil</h4><div class="nums">${s.siap.map(k=>`<span>${k}</span>`).join("")||'<small style="color:var(--mute)">-</small>'}</div></div></div><div class="ft">${s.menunggu} pesanan menunggu</div></div>`).join("");
  }).catch(()=>{});
}

/* ---------- staf ---------- */
function fillSel(){
  const s=$("selStan");if(!s)return;
  s.innerHTML=(view==="laporan"?'<option value="0">Semua kantin</option>':"")+stans.map(x=>`<option value="${x.id}">${emo(x)} ${esc(x.nama)}</option>`).join("");
  s.value=String(dStan);
}
function setStaff(u){
  U=u;$("nav").classList.toggle("st",!!u);
  $("staffBtn").textContent=u?"Keluar ("+u.nama.split(" ")[0]+")":"Masuk staf";
  if(!u&&["dapur","menu","laporan"].includes(view))setView("pesan");
  $("staffBar").hidden=!(u&&u.role==="admin"&&["dapur","menu","laporan"].includes(view));
}
function showLogin(){$("lerr").textContent="";$("ovLogin").classList.add("on")}
function masuk(){api("login",{u:$("lu").value,p:$("lp").value}).then(u=>{setStaff(u);$("ovLogin").classList.remove("on");$("lp").value="";loadKatalog().then(()=>setView("dapur"))}).catch(e=>{$("lerr").textContent=e.message})}

function act(o){
  const nx={menunggu:["dimasak","Mulai masak"],dimasak:["siap","Siap diambil"],siap:["selesai","Sudah diambil"]}[o.status];
  return `<button class="btn" data-u="${o.id}:${nx[0]}">${nx[1]}</button><button class="btn del" data-u="${o.id}:batal" aria-label="Batalkan">Batal</button>`;
}
const ocard=o=>`<article class="oc ${o.status}"><div class="oh"><b class="code">${o.kode}</b><span class="mn">${mins(o.t)} mnt lalu</span></div><div>${esc(o.nama)} &middot; ${esc(o.kelas||"-")}</div><ul>${o.items.map(i=>`<li><b>${i.q}&times;</b> ${esc(i.n)}</li>`).join("")}</ul>${o.catatan?`<div class="note">&#128221; ${esc(o.catatan)}</div>`:""}<div class="oa">${act(o)}</div></article>`;
function loadDapur(){
  if(!U)return;
  api("dapur",null,"&stan_id="+sid()).then(j=>{
    const by=s=>j.orders.filter(o=>o.status===s),n=by("menunggu").length;
    if(lastMenunggu>=0&&n>lastMenunggu){beep();toast("Pesanan baru masuk!")}lastMenunggu=n;
    const col=(t,s)=>`<div><h3>${t} (${by(s).length})</h3>${by(s).map(ocard).join("")||'<div class="empty" style="padding:14px">Kosong</div>'}</div>`;
    $("dapurBox").innerHTML=`<div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div class="th" style="--c:${esc(j.stan.warna)}">${emo(j.stan)}</div><div style="flex:1"><b style="font-size:17px">${esc(j.stan.nama)}</b><br><span style="color:var(--mute);font-size:13px">${j.hari} pesanan &bull; ${rp(j.omzet)} &bull; rata-rata ${j.tunggu||0} mnt</span></div><button class="sw${j.stan.buka?" on":""}" id="bukaSw" aria-label="Buka atau tutup kantin" title="${j.stan.buka?"Buka":"Tutup"}"></button></div><div class="kan">${col("Menunggu","menunggu")}${col("Dimasak","dimasak")}${col("Siap diambil","siap")}</div>`;
  }).catch(e=>toast(e.message));
}
function renderMenuStaf(){
  if(!U)return;
  const l=stans.filter(s=>U.role==="admin"?s.id===sid():s.id===U.stan_id);
  $("menuBox").innerHTML=(U.role==="admin"?`<div class="top"><h2>Kantin</h2><button class="btn sec" id="editStan">Ubah kantin</button><button class="btn sec" id="newStan">+ Kantin baru</button></div>`:"")+
  l.map(s=>`<div class="top"><h2>Menu ${esc(s.nama)}</h2><button class="btn" id="newMenu">+ Tambah menu</button></div><div class="card">`+(s.menu.map(m=>`<div class="row"><div class="th" style="--c:${esc(s.warna)}">${m.foto?`<img src="${esc(m.foto)}" alt="">`:emo(m)}</div><div class="t"><b>${esc(m.nama)}</b><span>${rp(m.harga)} &middot; ${m.waktu} mnt &middot; ${esc(m.kategori)}</span></div><button class="edit" data-em="${m.id}">Ubah</button><button class="sw${m.tersedia?" on":""}" data-tg="${m.id}" aria-label="Tersedia atau habis"></button></div>`).join("")||empty("Belum ada menu"))+`</div>`).join("");
}
function openMenu(id){
  editM=id||null;foto=null;const m=id?stans.flatMap(s=>s.menu).find(x=>x.id===id):null;
  $("mjudul").textContent=m?"Ubah menu":"Tambah menu";$("mStanWrap").style.display=U.role==="admin"&&!m?"block":"none";
  $("mStan").innerHTML=stans.map(s=>`<option value="${s.id}">${esc(s.nama)}</option>`).join("");$("mStan").value=String(sid());
  $("mNama").value=m?m.nama:"";$("mEmoji").value=m?m.emoji:"";$("mKat").value=m?m.kategori:"Makanan";$("mHarga").value=m?m.harga:"";$("mWaktu").value=m?m.waktu:5;
  $("mPrev").src=m&&m.foto?m.foto:"";$("mPrev").style.display=m&&m.foto?"block":"none";$("mFoto").value="";$("mHapus").style.display=m?"block":"none";$("mHapus").textContent="Hapus menu";$("mHapus").dataset.s="";
  $("ovMenu").classList.add("on");
}
function simpanMenu(){
  const o={id:editM||0,stan_id:+$("mStan").value,nama:$("mNama").value.trim(),emoji:$("mEmoji").value.trim()||"🍽️",kategori:$("mKat").value,harga:num($("mHarga").value),waktu:num($("mWaktu").value)||5};
  if(!o.nama){toast("Isi nama menu dulu");return}if(!o.harga){toast("Isi harga dulu");return}
  if(foto)o.foto_data=foto;
  api("simpan_menu",o).then(()=>{$("ovMenu").classList.remove("on");toast("Menu tersimpan");lastKat="";loadKatalog()}).catch(e=>toast(e.message));
}
function openStan(id){
  editS=id||null;const s=id?stanById(id):null;$("sjudul").textContent=s?"Ubah kantin":"Kantin baru";
  $("sNama").value=s?s.nama:"";$("sEmoji").value=s?s.emoji:"";$("sKode").value=s?s.kode:"";$("sWarna").value=s?s.warna:"#4F46E5";$("ovStan").classList.add("on");
}
function simpanStan(){
  api("simpan_stan",{id:editS||0,nama:$("sNama").value,emoji:$("sEmoji").value.trim()||"🍽️",kode:$("sKode").value,warna:$("sWarna").value}).then(()=>{$("ovStan").classList.remove("on");toast("Kantin tersimpan");lastKat="";loadKatalog()}).catch(e=>toast(e.message));
}
function loadLaporan(){
  if(!U)return;fillSel();
  api("laporan",null,"&stan_id="+sid()).then(j=>{
    const m={},days=[];j.minggu.forEach(r=>{m[r.d]=r});let mx=1;
    for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2),c=m[k]?+m[k].c:0;mx=Math.max(mx,c);days.push({l:d.toLocaleDateString("id-ID",{weekday:"short"}),c})}
    const svg=`<svg viewBox="0 0 350 145" width="100%" role="img" aria-label="Grafik pesanan 7 hari">`+days.map((x,i)=>{const h=Math.round(x.c/mx*90),X=i*50+8;return `<rect x="${X}" y="${112-h}" width="34" height="${Math.max(h,3)}" rx="8" fill="${i===6?"var(--acc)":"var(--pri)"}"/><text x="${X+17}" y="132" text-anchor="middle" font-size="11" fill="var(--mute)">${x.l}</text>${x.c?`<text x="${X+17}" y="${106-h}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${x.c}</text>`:""}`}).join("")+`</svg>`;
    $("lapBox").innerHTML=`<div class="stats"><div class="stat hero2"><span>Pendapatan hari ini</span><b>${rp(j.omzet)}</b></div><div class="stat"><span>Pesanan</span><b>${j.hari}</b></div><div class="stat"><span>Rata-rata tunggu</span><b>${j.tunggu||0} mnt</b></div><div class="stat"><span>Dibatalkan</span><b>${j.batal}</b></div></div>`+
    `<div class="card"><div class="top"><h2>Pesanan 7 hari terakhir</h2><a class="btn sec" style="text-decoration:none;text-align:center" href="api.php?aksi=csv">Unduh CSV</a></div>${svg}</div>`+
    `<div class="card"><h2 style="margin-bottom:6px">Menu terlaris hari ini</h2>${j.top.length?j.top.map((t,i)=>`<div class="row"><div class="t"><b>${i+1}. ${esc(t.n)}</b></div><b>${t.q} porsi</b></div>`).join(""):empty("Belum ada penjualan")}</div>`+
    (j.per.length?`<div class="card"><h2 style="margin-bottom:6px">Per kantin hari ini</h2>${j.per.map(p=>`<div class="row"><div class="t"><b>${emo(p)} ${esc(p.nama)}</b><span>${p.c} pesanan</span></div><b>${rp(p.t)}</b></div>`).join("")}</div>`:"");
  }).catch(e=>toast(e.message));
}

/* ---------- event ---------- */
$("nav").addEventListener("click",e=>{const b=e.target.closest("button");if(b)setView(b.dataset.v)});
$("stanList").addEventListener("click",e=>{const b=e.target.closest("[data-s]");if(!b)return;const s=stanById(+b.dataset.s);if(s){cur=s;kat="Semua";renderPesan();window.scrollTo(0,0)}});
$("menuWrap").addEventListener("click",e=>{
  if(e.target.closest("#back")){if(cartN()&&!confirm("Keranjang akan dikosongkan. Lanjut?"))return;cart={};cur=null;renderPesan();return}
  const k=e.target.closest("[data-k]");if(k){kat=k.dataset.k;renderPesan();return}
  const a=e.target.closest("[data-a]");if(a)addC(+a.dataset.a);const d=e.target.closest("[data-d]");if(d)subC(+d.dataset.d);
});
$("cbtn").addEventListener("click",openCo);
$("coLines").addEventListener("click",e=>{const a=e.target.closest("[data-a]");if(a){addC(+a.dataset.a);renderCo()}const d=e.target.closest("[data-d]");if(d){subC(+d.dataset.d);if(cartN())renderCo()}});
$("cMet").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;met=b.dataset.m;[...$("cMet").children].forEach(x=>x.classList.toggle("on",x===b))});
$("coGo").addEventListener("click",pesan);
$("tiketGo").addEventListener("click",()=>{$("ovTiket").classList.remove("on");setView("saya")});
$("myList").addEventListener("click",e=>{const b=e.target.closest("[data-bt]");if(!b||!confirm("Batalkan pesanan ini?"))return;api("batalkan",{id:+b.dataset.bt}).then(()=>{toast("Pesanan dibatalkan");pollSaya(false)}).catch(er=>toast(er.message))});
$("fs").addEventListener("click",()=>{document.body.classList.add("tv");const el=document.documentElement;if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});toast("Ketuk layar dua kali atau tekan Esc untuk keluar")});
document.addEventListener("fullscreenchange",()=>{if(!document.fullscreenElement)document.body.classList.remove("tv")});
$("board").addEventListener("dblclick",()=>{document.body.classList.remove("tv");if(document.fullscreenElement)document.exitFullscreen()});
$("staffBtn").addEventListener("click",()=>{if(U){api("logout",{}).then(()=>setStaff(null))}else showLogin()});
$("masuk").addEventListener("click",masuk);$("lp").addEventListener("keydown",e=>{if(e.key==="Enter")masuk()});
$("selStan").addEventListener("change",function(){dStan=+this.value;lastMenunggu=-1;if(view==="menu")renderMenuStaf();tick()});
$("dapur").addEventListener("click",e=>{
  const b=e.target.closest("[data-u]");
  if(b){const[id,st]=b.dataset.u.split(":");if(st==="batal"&&!confirm("Batalkan pesanan ini?"))return;api("ubah",{id:+id,status:st}).then(loadDapur).catch(er=>toast(er.message));return}
  if(e.target.closest("#bukaSw"))api("buka",{stan_id:sid()}).then(()=>{lastKat="";loadDapur();loadKatalog()}).catch(er=>toast(er.message));
});
$("menu").addEventListener("click",e=>{
  const t=e.target.closest("[data-tg]");if(t){api("toggle",{id:+t.dataset.tg}).then(()=>{lastKat="";loadKatalog()}).catch(er=>toast(er.message));return}
  const m=e.target.closest("[data-em]");if(m){openMenu(+m.dataset.em);return}
  if(e.target.closest("#newMenu"))openMenu(null);if(e.target.closest("#editStan"))openStan(sid());if(e.target.closest("#newStan"))openStan(null);
});
$("mSimpan").addEventListener("click",simpanMenu);
$("mHapus").addEventListener("click",function(){if(!this.dataset.s){this.dataset.s="1";this.textContent="Ketuk lagi untuk menghapus";return}api("hapus_menu",{id:editM}).then(()=>{$("ovMenu").classList.remove("on");toast("Menu dihapus");lastKat="";loadKatalog()}).catch(er=>toast(er.message))});
$("sSimpan").addEventListener("click",simpanStan);
$("mFoto").addEventListener("change",function(){
  const f=this.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),k=Math.min(1,320/Math.max(im.width,im.height));c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);foto=c.toDataURL("image/jpeg",.8);$("mPrev").src=foto;$("mPrev").style.display="block"};im.onerror=function(){toast("Foto tidak bisa dibaca. Coba format JPG atau PNG")};im.src=r.result};
  r.readAsDataURL(f);
});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>b.closest(".ov").classList.remove("on")));
document.querySelectorAll(".ov").forEach(o=>o.addEventListener("click",e=>{if(e.target===o)o.classList.remove("on")}));
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".ov.on").forEach(o=>o.classList.remove("on"))});

api("me").then(j=>{setStaff(j.u)}).catch(()=>{});
loadKatalog();pollSaya(true);
})();
