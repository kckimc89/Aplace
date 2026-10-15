(()=>{
'use strict';
const BASE=window.LANDMARK_BASE;
if(!BASE){document.getElementById('view').innerHTML='<p class="warning">명소 자료 파일을 불러오지 못했습니다. ZIP 내부 파일을 모두 함께 올려주세요.</p>';return;}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').toLocaleLowerCase().replace(/[\s.,·_\-()'"’]/g,'');
const STORE='world_landmarks_stage0_1__ISOLATED_v1';
const CATS=BASE.categories,COUNTRY_MAP=new Map(BASE.countries.map(x=>[x.code,x]));
const cName=code=>COUNTRY_MAP.get(code)?.name||code;
const category=x=>CATS.find(c=>c.id===x)||CATS[0];
const keyPhoto=id=>CSS.escape(id);
const countryPriority=['KR','CN','JP','TW'];
const FOCUS_COUNTRIES=['KR','JP','CN','TW','FR','US','TH','VN','IT','GB','ES','SG','AU','DE','CH'];
let showAllCountries=false;
const countryEnglish=(typeof Intl.DisplayNames==='function')?new Intl.DisplayNames(['en'],{type:'region'}):null;
const continents=['아시아','유럽','아프리카','북아메리카','남아메리카','오세아니아'];
const countrySort=(a,b)=>{const ia=continents.indexOf(a.continent),ib=continents.indexOf(b.continent);if(ia!==ib)return ia-ib;const pa=countryPriority.indexOf(a.code),pb=countryPriority.indexOf(b.code);if(pa>=0||pb>=0)return (pa>=0?pa:99)-(pb>=0?pb:99);return a.name.localeCompare(b.name,'ko');};
const JASO_CHO=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JASO_JUNG=['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JASO_JONG=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function hangulKey(input){let s='';for(const c of String(input)){const n=c.codePointAt(0)-0xAC00;if(n>=0&&n<11172)s+=JASO_CHO[Math.floor(n/588)]+JASO_JUNG[Math.floor((n%588)/28)]+JASO_JONG[n%28];else s+=c;}return norm(s);}
function match(text,q){return !q||norm(text).includes(norm(q))||hangulKey(text).includes(hangulKey(q));}
function readStore(){try{const a=JSON.parse(localStorage.getItem(STORE)||'{}');return {added:Array.isArray(a.added)?a.added:[],overrides:a.overrides&&typeof a.overrides==='object'?a.overrides:{},countryOverviews:a.countryOverviews&&typeof a.countryOverviews==='object'?a.countryOverviews:{},favorite:Array.isArray(a.favorite)?a.favorite:[],wish:Array.isArray(a.wish)?a.wish:[]};}catch(e){return {added:[],overrides:{},countryOverviews:{},favorite:[],wish:[]};}}
let edits=readStore();
let state={view:'home',country:'KR',countrySearch:'',countryExpanded:false,countryCardsVisible:false,countryFilter:'all',guidePlaying:false,cat:'all',search:'',photoCat:'all',photoCountry:'all',admin:false,detailId:'',galleryIndex:0,photoIndex:0,zoom:1,lightbox:[],editorId:'',wikidataResults:[],wikidataQuery:'',wikidataMessage:'',wikidataLoading:false,researchCountry:'KR',researchCategory:'all',researchDiscovery:[],researchLoading:false,researchMessage:'',researchPreview:null,researchPreviewError:'',researchSeedId:'',researchQuery:'',pendingResearch:null,commonsMsg:'',commonsLoading:false};
const wikiCache=new Map(), commonsCache=new Map(),entityCache=new Map();
const seedMap=new Map(BASE.landmarks.map(x=>[x.id,x]));
let photosObserver=null,toastTimeout=0;
function allLandmarks(){return [...BASE.landmarks,...edits.added].map(x=>({...x,...(edits.overrides[x.id]||{})}));}
function getLandmark(id){return allLandmarks().find(x=>x.id===id)||null;}
function countries(){return BASE.countries.slice().sort(countrySort);}
function countryIntro(c){return edits.countryOverviews[c.code]??c.overview??'';}
function save(){try{localStorage.setItem(STORE,JSON.stringify(edits));return true;}catch(e){alert('저장공간이 부족하거나 브라우저 저장이 제한되어 있습니다. 먼저 백업해 주세요.');return false;}}
function notify(message){document.querySelector('.toast')?.remove();const div=document.createElement('div');div.className='toast';div.textContent=message;document.body.append(div);clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>div.remove(),2700);}
function uri(url){try{const u=new URL(url,location.href);return /^https?:$/.test(u.protocol)?u.href:'';}catch(e){return '';}}
function wikiLink(x){const lang=/^[a-z-]+$/.test(x.wikiLang||'')?x.wikiLang:'en';return 'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(String(x.wikiTitle||x.aliases?.[0]||x.name).replaceAll(' ','_'));}
function namedPhoto(f){const selected=(f.photos||[]).find(p=>p.hero)||(f.photos||[])[0];return selected&&uri(selected.url)?{...selected,confirmed:true}:wikiCache.get(f.id)||null;}
function gallery(f){const out=[];for(const x of f.photos||[]){if(uri(x.url))out.push({...x,confirmed:true});}const base=wikiCache.get(f.id);if(base&&uri(base.url)&&!out.some(p=>p.url===base.url))out.push({...base,confirmed:false});return out;}
const typeEmoji=id=>category(id).icon||'🏛️';
function photoTag(f){const p=namedPhoto(f);return p?(p.confirmed?'✅ 확인된 사진':'🔎 참고사진 · 검토 전'):'📸 사진 준비 중';}
function photoFrame(f,style=''){const p=namedPhoto(f);return `<div class="photo-frame ${style}" data-photo-for="${esc(f.id)}">${p?`<img src="${esc(uri(p.url))}" alt="${esc(f.name)}" loading="lazy" onerror="this.closest('.photo-frame').querySelector('.photo-fallback').style.display='flex';this.style.display='none'">`:''}<div class="photo-fallback" ${p?'style="display:none"':''}><span class="symbol">${esc(typeEmoji(f.category))}</span><b>${esc(f.name)}</b><span class="small">대표 사진을 찾는 중...</span></div><span class="photo-tag">${photoTag(f)}</span></div>`;}
function landmarkCard(f){return `<button type="button" data-act="open-detail" data-id="${esc(f.id)}" class="landmark-card">${photoFrame(f)}<div class="landmark-body"><div class="landmark-name">${esc(f.name)}</div><div class="landmark-region">${esc(COUNTRY_MAP.get(f.countryCode)?.flag)} ${esc(cName(f.countryCode))} · ${esc(f.region)}</div><div><span class="pill ${f.verified?'green':'purple'}">${esc(typeEmoji(f.category))} ${esc(category(f.category).name)}</span></div><div class="landmark-desc">${esc(f.description)}</div></div></button>`;}
function countView(){const all=allLandmarks();return `<span class="stat">🌐 ${BASE.countries.length}개국</span><span class="stat">🏛️ ${all.length}개 명소</span><span class="stat">📸 사진첩</span><span class="stat">⭐ ${edits.wish.length}곳 가보고 싶어요</span>`;}
function controls(){const b=$('#parentToggle');b.classList.toggle('on',state.admin);b.textContent=state.admin?'🔓 부모모드 ON · 끄기':'🔒 부모모드 OFF · 켜기';$('#headerStats').innerHTML=countView();document.querySelectorAll('[data-go]').forEach(n=>n.classList.toggle('active',n.dataset.go===state.view));}
function renderHome(){const items=allLandmarks(),feature=items.find(x=>x.id==='FR-L01')||items[0],pilot=BASE.pilotCountries.map(x=>COUNTRY_MAP.get(x));return `<section class="panel"><div class="section-head"><h2>✨ 오늘의 명소</h2><small>사진으로 세계를 만나요</small></div><div class="home-feature"><div>${photoFrame(feature,'landscape')}</div><div class="home-feature-info"><span class="eyebrow">🌍 세계 명소 탐험의 시작</span><h2 class="feature-title">${esc(feature.name)}</h2><div class="pill-row"><span class="pill">🇫🇷 프랑스</span><span class="pill">${esc(typeEmoji(feature.category))} ${esc(category(feature.category).name)}</span></div><p class="feature-desc">${esc(feature.description)}</p><button class="btn primary" type="button" data-act="open-detail" data-id="${esc(feature.id)}">🔍 사진과 이야기 살펴보기 →</button></div></div></section>
 <section class="panel"><div class="section-head"><h2>🌐 먼저 떠나는 15개국</h2><small>나라별 공통설명 준비</small></div><div class="category-grid pilot-country-grid">${pilot.map(c=>`<button type="button" class="category-button" data-act="country-go" data-code="${esc(c.code)}"><span>${esc(c.flag)}</span>${esc(c.name)}</button>`).join('')}</div><div class="action-row"><button class="btn" data-go="countries">우선 15개국 나라 목록 →</button></div></section>
 <section class="panel"><div class="section-head"><h2>🎧 나라 사진 여행</h2><small>전체화면 사진과 짧은 관광가이드</small></div><p class="lead">명소의 대표사진을 크게 보면서, 나라의 이야기를 짧고 인상적으로 들어보세요. 이번에는 핵심 6개국의 명소를 모두 여행합니다. 사진은 온라인 상황에 따라 일부 준비 중일 수 있습니다.</p><div class="action-row"><button class="btn primary" data-act="start-country-tour" data-code="FR">🇫🇷 프랑스 사진 여행</button><button class="btn " data-act="start-country-tour" data-code="KR">🇰🇷 대한민국 사진 여행</button><button class="btn " data-act="start-country-tour" data-code="JP">🇯🇵 일본 사진 여행</button><button class="btn " data-act="start-country-tour" data-code="CN">🇨🇳 중국 사진 여행</button><button class="btn " data-act="start-country-tour" data-code="IT">🇮🇹 이탈리아 사진 여행</button><button class="btn " data-act="start-country-tour" data-code="ES">🇪🇸 스페인 사진 여행</button></div></section>
 <section class="panel"><div class="section-head"><h2>🧭 일곱 가지 명소 탐험</h2><small>원하는 종류를 선택하세요</small></div><div class="category-grid">${CATS.map(c=>`<button class="category-button" type="button" data-act="cat-go" data-cat="${esc(c.id)}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}</div></section>
 <section class="panel"><div class="section-head"><h2>📷 대표명소 먼저 만나기</h2><small>첫 5개국 40개 초안 · 인기 15개국 확대 준비</small></div><div class="card-grid">${['KR-L01','CN-L01','JP-L01','TW-L01','FR-L03','FR-L01'].map(id=>items.find(x=>x.id===id)).filter(Boolean).map(landmarkCard).join('')}</div></section>
 <div class="info">🌱 <b>첫 기본자료 안내:</b> 40개 명소의 이름·분류·설명·별칭은 미확정 기초자료입니다. 부모모드에서 검색 결과를 비교하세요. 사진은 위키미디어에서 온라인으로 불러오며, 검색된 사진은 부모가 정확성과 이용조건을 확인한 후 사진첩에 넣도록 설계했습니다.</div>`;}
function countryButtons(list){return `<div class="country-picker ${state.countryExpanded?'':'collapsed'}">${list.map(c=>`<button class="country-choice ${state.country===c.code?'selected':''}" type="button" data-act="set-country" data-code="${esc(c.code)}"><small>${esc(c.continent)}</small>${esc(c.flag)} ${esc(c.name)}</button>`).join('')}</div>`;}
function renderCountries(){const cs=countries().filter(c=>showAllCountries||FOCUS_COUNTRIES.includes(c.code)),search=state.countrySearch,list=cs.filter(c=>match([c.name,c.continent,c.code,COUNTRY_ALIASES[c.code]||'',countryEnglish?.of(c.code)||''].join(' '),search)).sort((a,b)=>{if(!search)return countrySort(a,b);const a0=norm(a.name).startsWith(norm(search))?0:1,b0=norm(b.name).startsWith(norm(search))?0:1;return a0!==b0?a0-b0:countrySort(a,b);}),curr=COUNTRY_MAP.get(state.country)||cs[0],places=allLandmarks().filter(f=>f.countryCode===curr.code);return `<section class="panel"><div class="section-head"><h2>🌏 나라 목록</h2><small>${showAllCountries?'101개국 전체':'우선 15개국'} · 대륙별 / 가나다순</small></div><form class="search-form" id="countryForm"><input type="search" id="countryInput" enterkeyhint="search" autocomplete="off" placeholder="나라 부분검색: 한, 중국, France, 아시아" value="${esc(search)}" aria-label="나라 검색"><button>검색</button></form><div class="muted small">아시아는 대한민국 → 중국 → 일본 → 대만 우선 · 입력 후 검색 버튼을 눌러주세요</div>${countryButtons(list)}<div class="action-row"><button class="btn" data-act="toggle-country-list">${state.countryExpanded?'▲ 2줄로 접기':'▼ 나라 목록 전체 펼치기'} (${list.length}개국)</button><button class="btn ghost" data-act="country-clear">검색 초기화</button><button class="btn blue" type="button" data-act="toggle-all-countries">${showAllCountries?'⭐ 우선 15개국만 보기':'🌐 101개국 전체 보기'}</button></div></section>
 <section class="panel"><div class="section-head"><h2>${esc(curr.flag)} ${esc(curr.name)}</h2><small>${esc(curr.continent)} · 명소 ${places.length}개</small></div><div class="country-info"><div class="action-row" style="margin:0 0 13px"><button type="button" class="btn primary" data-act="start-country-tour" data-code="${esc(curr.code)}">🎧 ${esc(curr.name)} 사진 여행</button><span class="muted small">준비된 사진과 전용 안내가 있을 때 진행됩니다.</span></div><h3>📖 이 나라를 먼저 알아봐요</h3><p class="lead">${esc(countryIntro(curr)||'이 나라의 자연·역사·도시를 소개할 공통설명을 준비하고 있습니다. 명소 발굴과 자료 확인을 마친 뒤 채워 넣겠습니다.')}</p></div>${places.length?`<div class="nameplate-tools">${filters(state.countryFilter,'country-filter')}<div class="action-row"><button type="button" class="btn" data-act="toggle-country-cards">${state.countryCardsVisible?'🙈 카드 전체 감추기':'🟢 완성 카드 보기'} (${places.filter(f=>f.verified).length})</button></div></div><div class="nameplate-grid">${places.filter(f=>state.countryFilter==='all'||f.category===state.countryFilter||(f.extraCategories||[]).includes(state.countryFilter)).map(f=>`<button type="button" class="nameplate ${f.verified?'plate-done':f.selectionStatus?.includes('오검색')?'plate-risk':f.nameAudit?'plate-candidate':'plate-empty'}" data-act="open-detail" data-id="${esc(f.id)}">${esc(f.name)}</button>`).join('')}</div>${state.countryCardsVisible?`<div class="card-grid">${places.filter(f=>f.verified&&(state.countryFilter==='all'||f.category===state.countryFilter||(f.extraCategories||[]).includes(state.countryFilter))).map(landmarkCard).join('')}</div>`:''}`:`<div class="blank"><span class="icon">🧭</span><strong>대표명소 선정을 준비하고 있어요.</strong><p>검색엔진을 통해 대표이름과 별칭부터 확인한 뒤 등록하겠습니다.</p></div>`}</section>`;}
const COUNTRY_ALIASES={KR:'한국 Korea South Korea',CN:'China 중국',JP:'Japan 일본',TW:'Taiwan 대만 타이완',FR:'France 프랑스',US:'USA America United States 미국',GB:'United Kingdom UK Britain 영국',IT:'Italy 이탈리아',ES:'Spain 스페인',DE:'Germany 독일',AU:'Australia 호주',IN:'India 인도',CA:'Canada 캐나다',BR:'Brazil 브라질',NP:'Nepal 네팔'};
function filteredByCat(items,cat){return cat==='all'?items:items.filter(f=>f.category===cat||(f.extraCategories||[]).includes(cat));}
function filters(chosen,callback){return `<div class="filter-row"><button class="filter-chip ${chosen==='all'?'on':''}" data-act="${callback}" data-cat="all">🌍 전체</button>${CATS.map(c=>`<button class="filter-chip ${chosen===c.id?'on':''}" data-act="${callback}" data-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>`;}
function renderLandmarks(){const all=filteredByCat(allLandmarks(),state.cat);return `<section class="panel"><div class="section-head"><h2>🏛️ 명소 탐험</h2><small>${all.length}개 명소 · 7개 분류</small></div>${filters(state.cat,'filter-cat')}<div class="card-grid">${all.map(landmarkCard).join('')}</div>${!all.length?`<div class="blank">이 분류의 명소를 준비하고 있습니다.</div>`:''}</section>`;}
function renderPhotos(){let a=filteredByCat(allLandmarks(),state.photoCat).filter(f=>state.photoCountry==='all'||f.countryCode===state.photoCountry);return `<section class="panel"><div class="section-head"><h2>🖼️ 사진으로 세계 여행</h2><small>${a.length}곳의 다양한 모습</small></div><div class="info">사진을 누르면 명소의 상세화면으로 이동합니다. 자동으로 불러오는 사진은 검토 전 참고사진이며, 사진첩에 보관되는 사진은 부모가 직접 선택합니다.</div>${filters(state.photoCat,'filter-photo-cat')}<div class="action-row"><label class="field" style="min-width:180px">나라 선택<select id="photoCountrySelect"><option value="all">모든 나라</option>${countries().map(c=>`<option value="${c.code}" ${state.photoCountry===c.code?'selected':''}>${esc(c.flag)} ${esc(c.name)}</option>`).join('')}</select></label></div><div class="card-grid" style="margin-top:15px">${a.map(landmarkCard).join('')}</div></section>`;}
function searchText(f){return [f.name,f.region,cName(f.countryCode),...(f.aliases||[]),f.wikiTitle,category(f.category).name,...(f.extraCategories||[]).map(a=>category(a).name)].join(' ');}
function renderSearch(){const arr=state.search?allLandmarks().filter(x=>match(searchText(x),state.search)):allLandmarks().slice(0,12);return `<section class="panel"><div class="section-head"><h2>🔎 세계 명소 검색</h2><small>한국어 · 영어 · 현지어 · 부분검색</small></div><form class="search-form" id="landmarkSearchForm"><input id="landmarkSearchInput" type="search" enterkeyhint="search" autocomplete="off" placeholder="경, Eiffel, 清水寺, 박물관" value="${esc(state.search)}"><button>검색</button></form><p class="muted small">iPad 한글 입력 보호: 입력 중 화면을 다시 그리지 않고, 검색 버튼을 누르면 결과가 표시됩니다.</p><h3>${state.search?`“${esc(state.search)}” 검색 결과 ${arr.length}개`:'처음 만나볼 명소'}</h3>${arr.length?`<div class="card-grid">${arr.map(landmarkCard).join('')}</div>`:`<div class="blank"><span class="icon">🔎</span>등록된 명소 중에는 검색 결과가 없습니다. 부모모드에서 위키데이터로 새 후보를 찾아볼 수 있습니다.</div>`}</section>`;}
function renderSaved(kind){const ids=kind==='wish'?edits.wish:edits.favorite;const title=kind==='wish'?'⭐ 가보고 싶어요':'❤️ 즐겨찾기';const a=ids.map(getLandmark).filter(Boolean);return `<section class="panel"><div class="section-head"><h2>${title}</h2><small>${a.length}곳</small></div>${a.length?`<div class="card-grid">${a.map(landmarkCard).join('')}</div>`:`<div class="blank"><span class="icon">${kind==='wish'?'⭐':'❤️'}</span>명소 상세화면에서 마음에 드는 장소를 저장해 보세요.</div>`}</section>`;}
function renderParent(){const items=allLandmarks(),numConfirmed=items.filter(f=>f.verified).length,numPhotographed=items.filter(f=>(f.photos||[]).length).length,editable=state.editorId?getLandmark(state.editorId):null;return `<section class="panel"><div class="section-head"><h2>👨‍👩‍👧 부모모드</h2><small>Stage 0.9 · 6개국 60개 대표명소 확장</small></div>${!state.admin?`<div class="info">위의 <b>부모모드 켜기</b>를 눌러 수정·검색·저장 기능을 사용해 주세요. 아이가 보는 동안에는 꺼 두면 좋습니다.</div>`:`<div class="parent-stats"><div class="parent-stat"><strong>101</strong>나라</div><div class="parent-stat"><strong>${items.length}</strong>명소 초안</div><div class="parent-stat"><strong>${numConfirmed}</strong>명소 설명 확인 완료</div><div class="parent-stat"><strong>${numPhotographed}</strong>사진첩 저장됨</div></div><div class="info">대표이름과 별칭은 검색엔진의 제안 및 국가 일치 확인 후 부모가 승인합니다. 기초 등록 명소는 자료 검증 상태를 구분해 표시하며, 검색 결과만으로 설명·사진이 검증되었다고 표시하지 않습니다. 사진은 위키미디어에서 찾아 직접 고릅니다.</div><div class="action-row"><button class="btn primary" data-act="parent-new">＋ 새 명소 등록</button><button class="btn green" data-act="download-backup">⬇ 전체 백업</button><label class="btn blue" style="cursor:pointer">⬆ 백업 복원<input type="file" id="importBackup" accept=".json,application/json" style="display:none"></label></div>`}</section>
 ${state.admin?`${renderSelectionEngine()}${renderWikidataSearch()}${renderEditor(editable)}${renderCountryEditor()}<section class="panel"><div class="section-head"><h2>🗂️ 등록 명소 관리</h2><small>이름·분류·별칭·설명 수정</small></div>${items.map(f=>`<div class="result-row"><div><b>${esc(COUNTRY_MAP.get(f.countryCode)?.flag)} ${esc(f.name)}</b><div class="muted small">${esc(f.region)} · ${esc(category(f.category).name)} · ${f.nameAudit?.countryStatus==='matched'?'이름·국가 부모확인':(f.verified?'설명 검토완료':'기초자료/확인 전')} · 사진 ${(f.photos||[]).length}장</div></div><div class="action-row" style="margin-top:0"><button class="btn btn-small" data-act="edit-place" data-id="${esc(f.id)}">수정</button><button class="btn btn-small" data-act="open-detail" data-id="${esc(f.id)}">사진</button></div></div>`).join('')}</section>`:''}`;}

// Stage 0.2: Search engine joins selection, identity checking, multilingual aliases.
// Search data is deliberately provisional until a parent reviews it.
const WD_COUNTRY={KR:'Q884',CN:'Q148',JP:'Q17',TW:'Q865',FR:'Q142'};
const NATIVE_LANG={KR:'ko',CN:'zh',JP:'ja',TW:'zh',FR:'fr'};
const LANGS=['ko','en','zh','ja','fr'];
const WD_TYPE_GROUP={all:['Q570116','Q41176','Q33506','Q46169','Q34038','Q8502','Q23413','Q16560','Q44539','Q22698','Q839954','Q12518','Q12280','Q330284','Q2977'], nature:['Q46169','Q34038','Q8502'],heritage:['Q839954','Q23413'],traditional:['Q16560','Q44539','Q2977'],modern:['Q41176','Q12518','Q12280'],park:['Q22698'],market:['Q330284'],museum:['Q33506']};
function wdURL(endpoint,params){const u=new URL(endpoint);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));return u;}
function wdString(o,lang){return String(o?.[lang]?.value||'').trim();}
function wdIds(e,prop){return (e?.claims?.[prop]||[]).map(c=>c.mainsnak?.datavalue?.value?.id).filter(x=>/^Q\d+$/.test(x||''));}
const WD_CATEGORY_HINT={Q8502:'nature',Q34038:'nature',Q46169:'nature',Q839954:'heritage',Q23413:'heritage',Q16560:'traditional',Q44539:'traditional',Q2977:'traditional',Q22698:'park',Q330284:'market',Q33506:'museum'};
function wdProposal(e,record){
 const labels=Object.fromEntries(LANGS.map(l=>[l,wdString(e.labels,l)]));
 const localized=labels.ko&&/[가-힣]/.test(labels.ko)?labels.ko:(record?.name||labels.en||labels.fr||e.id);
 const aliasSet=new Set([record?.name||'',...(record?.aliases||[])]);
 for(const l of LANGS){if(labels[l])aliasSet.add(labels[l]);for(const a of (e.aliases?.[l]||[]).slice(0,15)){if(a.value)aliasSet.add(String(a.value).trim());}}
 // A label/alias might be ambiguous: keep it in preview, not authoritative until review.
 const aliases=[...aliasSet].map(x=>x.trim()).filter(x=>x&&x!==localized).slice(0,75);
 const types=wdIds(e,'P31');
 const suggestedCategory=types.map(x=>WD_CATEGORY_HINT[x]).find(Boolean)||'';
 return {qid:e.id, proposedName:localized, labels,aliases,descriptions:Object.fromEntries(LANGS.map(l=>[l,wdString(e.descriptions,l)])),countries:wdIds(e,'P17'),locatedIn:wdIds(e,'P131'),types,suggestedCategory,image:(e.claims?.P18||[])[0]?.mainsnak?.datavalue?.value||'',sitelinks:Object.keys(e.sitelinks||{}).length};
}
async function wdEntity(qid){
 if(entityCache.has(qid))return entityCache.get(qid);
 if(!/^Q\d+$/.test(qid))throw Error('잘못된 위키데이터 번호');
 const url=wdURL('https://www.wikidata.org/w/api.php',{action:'wbgetentities',ids:qid,props:'labels|aliases|descriptions|claims|sitelinks',languages:LANGS.join('|'),format:'json',origin:'*'});
 const d=await fetchJSON(url),e=d.entities?.[qid];
 if(!e||e.missing)throw Error('위키데이터에 해당 항목이 없습니다.');
 entityCache.set(qid,e);return e;
}
async function wdQidFromWikipedia(f){
 if(f.qid&&/^Q\d+$/.test(f.qid))return {qid:f.qid,method:'existing-qid'};
 // Exact Wikipedia article → Wikidata QID rather than a broad text-only search.
 const url=wdURL('https://www.wikidata.org/w/api.php',{action:'wbgetentities',sites:(f.wikiLang||'en')+'wiki',titles:f.wikiTitle||f.name,props:'labels',languages:'en',format:'json',origin:'*'});
 const d=await fetchJSON(url);
 const match=Object.values(d.entities||{}).find(x=>!x.missing&&/^Q\d+$/.test(x.id||''));
 if(match)return {qid:match.id,method:'exact-wikipedia'};
 // Fallback is explicitly less certain and will not auto-approve.
 const url2=wdURL('https://www.wikidata.org/w/api.php',{action:'wbsearchentities',search:f.wikiTitle||f.name,language:'en',limit:'5',format:'json',origin:'*'});
 const d2=await fetchJSON(url2);
 return d2.search?.[0]?.id?{qid:d2.search[0].id,method:'fuzzy-search'}:null;
}
async function wdCheckCountry(proposal,countryCode){
 const target=WD_COUNTRY[countryCode];
 if(!target)return {status:'unknown',via:'해당 나라의 식별번호가 아직 연결되지 않았습니다.',codes:proposal.countries};
 if(proposal.countries.includes(target))return {status:'matched',via:'해당 명소의 국가(P17)',codes:proposal.countries};
 if(proposal.countries.length)return {status:'mismatch',via:'명소의 국가(P17)가 선택한 나라와 다릅니다.',codes:proposal.countries};
 // Some sights have no P17 but lie in a city or administrative region (P131).
 let level=proposal.locatedIn.slice(0,3);
 for(let depth=0;depth<2&&level.length;depth++){
   let parents=[];
   for(const qid of level){try{const e=await wdEntity(qid),cs=wdIds(e,'P17');if(cs.includes(target))return {status:'matched',via:'행정구역(P131) → 국가(P17)',codes:cs};if(cs.length)return {status:'mismatch',via:'상위 행정구역에 표시된 국가가 다릅니다.',codes:cs};parents.push(...wdIds(e,'P131'));}catch(_){}}
   level=[...new Set(parents)].slice(0,3);
 }
 return {status:'unknown',via:'국가 정보가 없거나 위치 관계로 확정할 수 없습니다. 사람이 확인해야 합니다.',codes:[]};
}
function researchBadge(r){const s=r?.countryStatus||'';return s==='matched'?'<span class="pill green">✅ 국가 정보 일치(검토 후보)</span>':s==='mismatch'?'<span class="pill red">⚠️ 다른 국가 정보 — 승인 금지</span>':'<span class="pill purple">❔ 국가 미확인 — 자동 승인 불가</span>';}
function proposalText(r){return [r.proposal?.descriptions.ko,r.proposal?.descriptions.en].filter(Boolean).join(' / ')||'위키데이터에 상세 설명이 없습니다.';}
function renderSelectionEngine(){
 const current=state.researchCountry;
 const seeds=allLandmarks().filter(f=>f.countryCode===current);
 const audited=seeds.filter(f=>f.nameAudit?.countryStatus==='matched').length;
 const countryOpts=BASE.pilotCountries.map(k=>COUNTRY_MAP.get(k));
 const dis=state.researchLoading?'disabled':'';
 const prev=state.researchPreview;
 const previewHtml=prev?`<div class="research-preview"><div class="section-head"><h3>🔎 검색 결과 검토</h3>${researchBadge(prev)}</div>
 <p><b>검색엔진 제안 이름:</b> ${esc(prev.proposal.proposedName)} · <b>식별번호:</b> <a class="link" target="_blank" rel="noopener noreferrer" href="https://www.wikidata.org/wiki/${esc(prev.proposal.qid)}">${esc(prev.proposal.qid)} ↗</a></p>
 <p class="small muted">식별 방법: ${esc(prev.lookupMethod==='exact-wikipedia'?'위키백과 문서 직접연결':prev.lookupMethod==='fuzzy-search'?'비슷한 이름 검색 · 정확한 식별번호 재확인 필요':prev.lookupMethod==='existing-qid'?'기등록 QID 다시 확인':'위키데이터 후보 직접선택')} · 국가 판정 근거: ${esc(prev.countryReason||'')} · 위키 문서 수 ${prev.proposal.sitelinks}개 (인기도·대표성 보증 아님)</p>
 <p class="lead small">${esc(proposalText(prev))}</p><p class="small"><b>분류 검색 제안:</b> ${esc(prev.proposal.suggestedCategory?category(prev.proposal.suggestedCategory).name:'구체적인 분류 정보 부족 · 부모 직접 선택 필요')} <span class="muted">(Wikidata P31에 근거한 초안, 자동 확정 아님)</span></p>
 <div class="research-names">${LANGS.filter(l=>prev.proposal.labels[l]).map(l=>`<span class="pill blue">${esc(l)}: ${esc(prev.proposal.labels[l])}</span>`).join('')}</div>
 <p class="muted small"><b>수집한 검색 별칭 ${prev.proposal.aliases.length}개:</b> ${esc(prev.proposal.aliases.slice(0,24).join(' · '))}${prev.proposal.aliases.length>24?' …':''}</p>
 <p class="small muted">분류는 초기 기본자료 또는 부모의 선택을 따릅니다. 자동검색만으로 명소 분류·설명·사진의 정확성을 확정하지 않습니다.</p>
 <div class="action-row">${prev.seedId?`<button class="btn green" data-act="approve-research" ${prev.countryStatus!=='matched'||prev.lookupMethod==='fuzzy-search'?'disabled title="국가와 정확한 명소 식별번호를 확인해야 승인할 수 있습니다"':''}>✅ 부모 확인 후 기존 명소에 이름·별칭 반영</button>`:`<button class="btn green" data-act="research-to-editor" ${prev.countryStatus!=='matched'?'disabled title="국가가 일치해야 등록 후보로 이동합니다"':''}>＋ 이 명소를 등록 후보로 가져오기</button>`}<button class="btn" data-act="clear-research">닫기</button></div></div>`:'';
 return `<section class="panel" id="selectionEngine"><div class="section-head"><h2>🧭 대표이름·만국검색 별칭 공동선정</h2><small>검색 → 국가확인 → 부모검토</small></div>
 <div class="info">Stage 0.1의 40개 이름은 <b>아직 확정되지 않은 초안</b>입니다. 위키데이터 항목 고유번호(QID)를 통해 한국어·영어·현지어 명칭과 국가 정보를 비교합니다. 일치하더라도 최종 반영은 부모가 결정합니다.</div>
 <div class="form-grid research-controls"><label class="field">검토할 나라<select id="researchCountrySelect">${countryOpts.map(c=>`<option value="${c.code}" ${c.code===current?'selected':''}>${esc(c.flag)} ${esc(c.name)}</option>`).join('')}</select></label>
 <label class="field">새 명소 발굴 분류<select id="researchCategorySelect"><option value="all">모든 종류</option>${CATS.map(c=>`<option value="${esc(c.id)}" ${state.researchCategory===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label></div>
 <div class="action-row"><button class="btn primary" data-act="discover-landmarks" ${dis}>${state.researchLoading?'검색 중…':'🌐 이 나라의 대표명소 후보 발굴'}</button><span class="muted small">등록 후보 ${seeds.length}곳 · 나라 일치·부모검토 반영 ${audited}곳</span></div>
 <p class="muted small">추천은 위키데이터의 장소 종류·국가·언어판 연결 수를 활용한 <b>발굴 후보</b>이며, 인기 순위나 최종 선정 목록이 아닙니다. 검색 연결에 실패하면 기존 40개 검토는 계속 가능합니다.</p>
 ${state.researchMessage?`<div class="info" role="status">${esc(state.researchMessage)}</div>`:''}
 ${state.researchPreviewError?`<div class="warning">${esc(state.researchPreviewError)}</div>`:''}
 <h3>📌 기존 기본자료 이름 재검토</h3><div class="research-list">${seeds.map(f=>`<div class="result-row"><div><b>${esc(f.name)}</b> <span class="muted small">${esc(category(f.category).name)}</span><div class="small ${f.nameAudit?.countryStatus==='matched'?'research-done':'muted'}">${f.nameAudit?.countryStatus==='matched'?'✅ 이름·별칭 부모검토 반영':'🔎 검색 검토 전'}${f.qid?` · ${esc(f.qid)}`:''}</div></div><button class="btn btn-small blue" data-act="inspect-seed" data-id="${esc(f.id)}" ${dis}>검색해 검토</button></div>`).join('')}</div>
 <h3 style="margin-top:19px">🌐 검색엔진의 새 명소 추천 (${state.researchDiscovery.length})</h3><div class="research-list">${state.researchDiscovery.map(r=>`<div class="result-row"><div><b>${esc(r.label)}</b> <span class="muted small">${esc(r.qid)} · 문서 ${r.links}개</span><div class="muted small">${esc(r.description||'설명 없음')}</div>${allLandmarks().some(x=>x.qid===r.qid)?'<span class="pill green">이미 등록된 식별번호</span>':''}</div><button class="btn btn-small blue" data-act="inspect-discovery" data-qid="${esc(r.qid)}" ${dis}>자세히 확인</button></div>`).join('')||'<p class="muted small">위의 「후보 발굴」 버튼을 누르면 실제 온라인 검색 결과가 나타납니다.</p>'}</div>
 ${previewHtml}</section>`;
}
async function inspectResearch(qid,seedId,countryCode,record){
 if(!state.admin||state.researchLoading)return;
 state.researchLoading=true;state.researchPreview=null;state.researchPreviewError='';state.researchMessage='위키데이터에서 장소·나라·여러 언어 이름을 확인하고 있습니다…';render();
 try{
  let lookupMethod='wikidata-candidate';if(!qid){const look=await wdQidFromWikipedia(record);if(!look?.qid)throw Error('위키백과 문서와 일치하는 식별번호를 찾지 못했습니다. 문서명을 확인해 주세요.');qid=look.qid;lookupMethod=look.method;}
  const entity=await wdEntity(qid),proposal=wdProposal(entity,record);
  const check=await wdCheckCountry(proposal,countryCode);
  state.researchPreview={seedId:seedId||'',countryCode,countryStatus:check.status,countryReason:check.via,lookupMethod,proposal};
  state.researchMessage=check.status==='matched'?(lookupMethod==='fuzzy-search'?'국가는 일치하나 이름 유사 검색으로 찾은 항목입니다. 위키데이터 번호를 다시 확인해야 하므로 바로 승인할 수 없습니다.':'국가 정보가 일치합니다. 이름·별칭을 검토하고 반영해 주세요.'):check.status==='mismatch'?'⚠️ 이 명소는 선택한 국가와 다른 국가로 표시됩니다. 잘못된 연결 가능성이 있으므로 반영할 수 없습니다.':'⚠️ 국가가 확정되지 않았습니다. 자료를 추가로 확인해야 합니다.';
 }catch(e){state.researchPreviewError='검색엔진 연결·식별에 실패했습니다: '+e.message;state.researchMessage='기본자료를 변경하지 않았습니다. 인터넷 연결·위키 문서명을 확인하거나 다시 시도하세요.';}
 finally{state.researchLoading=false;render();$('#selectionEngine')?.scrollIntoView({block:'start'});}
}
async function inspectSeed(id){const f=getLandmark(id);if(!f)return;state.researchCountry=f.countryCode;await inspectResearch('',f.id,f.countryCode,f);}
async function inspectDiscovery(qid){await inspectResearch(qid,'',state.researchCountry,null);}
async function discoverLandmarks(){
 if(!state.admin||state.researchLoading)return;
 state.researchLoading=true;state.researchDiscovery=[];state.researchPreview=null;state.researchPreviewError='';state.researchMessage='위키데이터에서 나라별 명소를 찾고 있습니다…';render();
 try{
   const country=WD_COUNTRY[state.researchCountry],types=WD_TYPE_GROUP[state.researchCategory]||WD_TYPE_GROUP.all;
   if(!country)throw Error('해당 나라 검색 범위가 아직 설정되지 않았습니다.');
   const q=`SELECT DISTINCT ?place ?placeLabel ?placeDescription ?links WHERE { VALUES ?type { ${types.map(x=>'wd:'+x).join(' ')} } ?place wdt:P17 wd:${country}; wdt:P31 ?type; wikibase:sitelinks ?links. FILTER(?links >= 4) SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en,fr,zh,ja". } } ORDER BY DESC(?links) LIMIT 35`;
   const url=wdURL('https://query.wikidata.org/sparql',{query:q,format:'json'});
   const d=await fetchJSON(url);
   const seen=new Set();
   state.researchDiscovery=(d.results?.bindings||[]).map(row=>({qid:String(row.place?.value||'').split('/').pop(),label:row.placeLabel?.value||'',description:row.placeDescription?.value||'',links:Number(row.links?.value)||0})).filter(r=>/^Q\d+$/.test(r.qid)&&!seen.has(r.qid)&&seen.add(r.qid));
   state.researchMessage=state.researchDiscovery.length?`${state.researchDiscovery.length}개를 발견했습니다. 목록은 인지도·대표성을 보장하지 않으므로 장소별 상세 검토가 필요합니다.`:'조건에 맞는 새 명소를 찾지 못했습니다. 범위를 넓히거나 기존 명소 검색으로 검토해 주세요.';
 }catch(e){state.researchMessage='온라인 후보 발굴이 실패했습니다. 위키데이터 검색 서버의 접속 제한이나 일시 장애일 수 있습니다. 기존 40개 개별 검색은 사용할 수 있습니다.';state.researchPreviewError='검색 실패: '+e.message;}
 finally{state.researchLoading=false;render();$('#selectionEngine')?.scrollIntoView({block:'start'});}
}
function approveResearch(){
 if(!state.admin)return;
 const r=state.researchPreview;
 if(!r||!r.seedId||r.countryStatus!=='matched'||r.lookupMethod==='fuzzy-search')return notify('국가가 일치하고 식별번호가 명확한 기존 명소만 반영할 수 있습니다.');
 const f=getLandmark(r.seedId);if(!f||f.countryCode!==r.countryCode)return;
 if(allLandmarks().some(x=>x.id!==f.id&&x.qid===r.proposal.qid))return alert('같은 위키데이터 식별번호가 다른 명소에 등록되어 있습니다. 먼저 중복 명소를 확인해 주세요.');
 const proposal=r.proposal;
 if(!confirm(`검색 결과의 나라·명소와 이름을 직접 확인하셨나요?\n\n현재: ${f.name}\n제안: ${proposal.proposedName}\n식별번호: ${proposal.qid}\n\n승인 시 기존 설명/사진은 변경하지 않고, 대표이름과 검색 별칭만 갱신합니다.`))return;
 const previous=edits.overrides[f.id]||{};
 const alt=[...new Set([f.name,...(f.aliases||[]),...proposal.aliases])].filter(Boolean).filter(x=>norm(x)!==norm(proposal.proposedName));
 edits.overrides[f.id]={...previous,name:proposal.proposedName,aliases:alt,qid:proposal.qid,nameAudit:{countryStatus:'matched',reviewedByParent:true,source:'wikidata',qid:proposal.qid,checkedAt:new Date().toISOString(),nativeLanguages:LANGS},selectionStatus:'이름·별칭 부모검토 반영'};
 if(save()){state.researchPreview=null;state.researchMessage=`${f.name}의 이름·별칭을 검토 반영했습니다. 기존 설명·사진·분류는 그대로입니다.`;render();notify('이름과 검색 별칭을 반영했습니다.');}
}
function researchToEditor(){
 const r=state.researchPreview;if(!state.admin||!r||r.seedId||r.countryStatus!=='matched')return;
 if(allLandmarks().some(f=>f.qid===r.proposal.qid))return alert('이미 등록된 명소입니다. 중복을 확인해 주세요.');
 state.editorId='';state.pendingResearch=r;render();
 const form=$('#placeEditForm');if(!form)return;
 form.elements.countryCode.value=r.countryCode;
 form.elements.category.value=r.proposal.suggestedCategory||(state.researchCategory==='all'?'nature':state.researchCategory);
 form.elements.name.value=r.proposal.proposedName;
 form.elements.aliases.value=r.proposal.aliases.join('\n');
 form.elements.qid.value=r.proposal.qid;
 // Don't copy a short machine description into educational Korean description.
 form.elements.description.value='';
 form.elements.region.value='';
 $('#editArea')?.scrollIntoView({behavior:'smooth',block:'start'});
 notify('검색 후보를 입력했습니다. 명소 분류·지역·설명을 검토한 뒤 저장하세요.');
}

function renderWikidataSearch(){return `<section class="panel"><div class="section-head"><h2>🔎 검색엔진과 함께 대표명소 선정</h2><small>위키데이터 후보 발굴</small></div><p class="lead small">등록하기 전에 이름의 뜻과 실제 장소를 확인합니다. 검색 결과는 검증된 명소가 아니라 <b>선정 후보</b>입니다.</p><form id="wikidataForm" class="search-form"><input id="wikidataInput" autocomplete="off" enterkeyhint="search" placeholder="예: Gyeongbokgung, Eiffel Tower, 万里长城" value="${esc(state.wikidataQuery)}"><button>후보 찾기</button></form><p class="muted small">${esc(state.wikidataMessage||'한국어·영어 후보를 검색하고, 위키데이터의 설명과 식별번호를 확인합니다.')}</p><div id="wikidataResults">${state.wikidataResults.map(r=>`<div class="result-row"><div><h4>${esc(r.label||r.id)} <span class="muted small">${esc(r.id)}</span></h4><p class="muted small">${esc(r.description||'설명 없음')}</p><a class="link small" href="https://www.wikidata.org/wiki/${esc(r.id)}" target="_blank" rel="noopener noreferrer">원본 확인 ↗</a></div><button type="button" class="btn btn-small" data-act="use-wikidata" data-qid="${esc(r.id)}">국가·별칭 확인</button></div>`).join('')}</div></section>`;}
function renderEditor(f){const x=f||{},cats=CATS.map(c=>`<option value="${c.id}" ${x.category===c.id?'selected':''}>${esc(c.name)}</option>`).join('');return `<section class="panel" id="editArea"><div class="section-head"><h2>${f?'✏️ 명소 정보 수정':'📝 대표명소 후보 등록'}</h2><small>대표이름·분류·검색 별칭</small></div><div class="editor"><form id="placeEditForm"><input type="hidden" name="id" value="${esc(x.id||'')}"><div class="form-grid"><label class="field">국가<select name="countryCode" required>${countries().map(c=>`<option value="${esc(c.code)}" ${x.countryCode===c.code?'selected':''}>${esc(c.flag)} ${esc(c.name)}</option>`).join('')}</select></label><label class="field">대표 분류<select name="category">${cats}</select></label><label class="field full">한국어 대표이름<input name="name" required placeholder="예: 에펠탑" value="${esc(x.name||'')}"></label><label class="field">도시·지역<input name="region" placeholder="예: 파리" value="${esc(x.region||'')}"></label><label class="field">위키데이터 식별번호(선택)<input name="qid" placeholder="예: Q243" value="${esc(x.qid||'')}"></label><label class="field full">다국어 검색 별칭 (줄바꿈 또는 쉼표 구분)<textarea name="aliases" placeholder="Eiffel Tower\nTour Eiffel">${esc((x.aliases||[]).join('\n'))}</textarea></label><label class="field full">한국어 설명<textarea name="description" placeholder="어떤 장소인지, 어디에 있는지, 왜 유명한지">${esc(x.description||'')}</textarea></label><label class="field">영어 위키 문서명 (사진 참고검색)<input name="wikiTitle" placeholder="Eiffel Tower" value="${esc(x.wikiTitle||'')}"></label><label class="field">추가 분류<select name="extraCategory"><option value="">없음</option>${CATS.filter(c=>c.id!==(x.category||'')).map(c=>`<option value="${c.id}" ${(x.extraCategories||[]).includes(c.id)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="field full" style="display:flex;flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="verified" style="width:18px;height:18px" ${x.verified?'checked':''}>이름·나라·설명·분류를 확인했습니다 (초록 완성으로 표시)</label></div><div class="action-row"><button class="btn primary" type="submit">💾 ${f?'수정 저장':'후보 명소 등록'}</button><button class="btn ghost" type="button" data-act="parent-new">새 항목으로</button>${f&&!seedMap.has(f.id)?`<button class="btn" type="button" data-act="delete-added" data-id="${esc(f.id)}">🗑️ 직접 추가한 항목 삭제</button>`:''}</div></form></div></section>`;}
function renderCountryEditor(){return `<section class="panel"><div class="section-head"><h2>📖 나라별 공통설명</h2><small>101개국 기초자료</small></div><form id="overviewForm" class="editor"><div class="form-grid"><label class="field">나라 선택<select name="code" id="overviewCode">${countries().map(c=>`<option value="${c.code}" ${state.country===c.code?'selected':''}>${esc(c.flag)} ${esc(c.name)}</option>`).join('')}</select></label><div></div><label class="field full">공통설명<textarea name="overview" id="overviewText">${esc(countryIntro(COUNTRY_MAP.get(state.country)))}</textarea></label></div><div class="action-row"><button class="btn primary">공통설명 저장</button></div></form></section>`;}

// Stage 0.5: the country tour includes EVERY registered landmark for France and Korea.
// Existing reviewed photos are reused. Wikipedia page images are temporary references only,
// not automatically approved or stored, and no unrelated substitute photos are shown.
const TOUR_STORIES={
 FR:{
 'FR-L01':['파리의 하늘을 가르는 에펠탑입니다. 1889년 만국박람회를 위해 세워졌지만, 처음에는 이 철탑의 모습을 못마땅해하는 사람들도 있었답니다.','수많은 철제 부재가 정교하게 이어져 있습니다. 밤에 빛나는 모습까지, 파리의 상징이 된 이유를 사진으로 느껴 보세요.'],
 'FR-L02':['이번에는 예술의 세계로 떠납니다. 루브르 박물관은 한때 프랑스 왕들이 사용하던 궁전이었습니다.','지금은 모나리자를 비롯한 수많은 작품을 만날 수 있지요. 거대한 건물 자체도 중요한 역사 이야기입니다.'],
 'FR-L03':['노르망디 해안에 솟은 몽생미셸입니다. 바다 위에 작은 도시와 수도원이 떠 있는 것처럼 보이지요.','건물들이 겹겹이 이어진 섬 위에는 오래된 수도원이 자리하고 있습니다. 바위 위에 어떻게 이런 건물을 세웠을까요?','이번에는 주변 바다도 살펴보세요. 밀물과 썰물에 따라 갯벌과 물길이 달라져, 같은 섬도 전혀 다른 모습으로 보인답니다.'],
 'FR-L04':['베르사유 궁전에 도착했습니다. 프랑스 왕실이 화려한 권력을 보여 주던 장소입니다.','궁전의 넓은 방과 정원을 떠올려 보세요. 건축과 정원이 하나의 거대한 작품처럼 이어집니다.'],
 'FR-L05':['이번에는 파리의 샹젤리제 거리입니다. 나무가 늘어선 길을 따라 카페와 상점이 이어집니다.','길 끝에는 개선문이 보이지요. 파리에서는 걷는 길 자체가 특별한 풍경이 되기도 합니다.'],
 'FR-L06':['커다란 문처럼 보이지만, 이곳은 에투알 개선문입니다. 프랑스의 군사 역사와 기억을 담은 기념물이지요.','여러 갈래의 길이 이 주변에서 별처럼 펼쳐집니다. 높은 곳에서 내려다보면 도시의 모양도 흥미롭습니다.'],
 'FR-L07':['센강의 섬 위에 선 노트르담 대성당입니다. 돌로 쌓아 올린 높은 공간과 정교한 조각이 눈길을 끕니다.','커다란 장미창과 고딕 양식의 구조는 오랜 세월 건축가들이 남긴 놀라운 솜씨를 보여 줍니다.'],
 'FR-L08':['이제 파리에서 벗어나 베르동 협곡으로 향합니다. 높은 석회암 절벽 사이로 푸른 물이 흐릅니다.','사람이 만든 건축물과는 다른 아름다움이지요. 오랜 시간 물이 깎아 만든 자연의 조각 작품입니다.']},
 KR:{
 'KR-L01':['서울 한복판에 있는 경복궁입니다. 조선 왕조의 중심 궁궐이었지요.','넓은 마당과 지붕의 선을 살펴보세요. 오래전 사람들이 생각한 아름다운 공간이 오늘까지 전해집니다.']}
};
let tourPending=false,tourCountryCode='FR',tourFinishing=false;
function tourElement(){return document.getElementById('countryTour');}
function tourSentences(f){
 const special=TOUR_STORIES[f.countryCode]?.[f.id];if(special)return special;
 const pieces=String(f.description||'').match(/[^.!?。]+[.!?。]?/g)?.map(x=>x.trim()).filter(Boolean)||[];
 if(!pieces.length)return [`${f.name}에 도착했습니다. 이 명소의 이야기는 아직 준비하고 있습니다.`];
 const first=`이번에는 ${f.region||cName(f.countryCode)}의 ${f.name}입니다. ${pieces.slice(0,2).join(' ')}`;
 const second=pieces.slice(2).join(' ');
 return second?[first,second]:[first];
}
async function tourWikiPhoto(f){
 if(!f.wikiTitle)return null;
 try{const lang=/^[a-z-]+$/.test(f.wikiLang||'')?f.wikiLang:'en';const u=new URL(`https://${lang}.wikipedia.org/w/api.php`);
 for(const [k,v] of Object.entries({action:'query',format:'json',origin:'*',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'1400',titles:f.wikiTitle,redirects:'1'}))u.searchParams.set(k,v);
 const d=await fetchJSON(u);const x=Object.values(d.query?.pages||{}).find(x=>x.thumbnail?.source);
 if(x&&uri(x.thumbnail.source))return {url:x.thumbnail.source,title:x.pageimage||f.wikiTitle,source:wikiLink(f),artist:'Wikipedia',license:'사진 이용조건 확인 필요',confirmed:false};
 }catch(e){}return null;
}
async function makeCountryTour(code){
 const all=allLandmarks().filter(x=>x.countryCode===code);
 if(!all.length)return [];
 const pictureSets=await Promise.all(all.map(async f=>{
  const confirmed=gallery(f).filter(p=>p.confirmed&&uri(p.url));
  const extra=await tourWikiPhoto(f);
  if(extra&&!confirmed.some(p=>p.url===extra.url))confirmed.push(extra);
  return confirmed;
 }));
 const slides=[];
 all.forEach((f,i)=>{
  const pics=pictureSets[i];const texts=tourSentences(f);
  // One or two short narration sections per landmark. Without a second picture,
  // the same photograph can stay on-screen but no fictitious new viewpoint is claimed.
  // Give every distinct image its own scene. The third Mont-Saint-Michel image
  // now gets a dedicated narration instead of being silently skipped.
  const count=pics.length?Math.max(texts.length,pics.length):1;
  for(let j=0;j<count;j++){
   const text=texts[j]||(j< pics.length ? `${f.name}의 모습이 다른 각도에서 이어집니다. 사진마다 건축과 풍경의 새로운 특징이 보입니다.`:'');
   slides.push({id:f.id,name:f.name,photo:pics[j]||pics[pics.length-1]||null,text,landmarkIndex:i+1,landmarkTotal:all.length});
  }
 });
 return slides;
}
function stopCountryTour(){tourRun++;tourActive=false;tourFinishing=false;tourPending=false;try{speechSynthesis.cancel();}catch(_){}tourElement()?.classList.remove('open');tourElement()?.setAttribute('aria-hidden','true');}
function drawCountryTour(){
 const x=tourList[tourIndex],root=tourElement();if(!x||!root)return;
 const collage=root.querySelector('#tourCollage');if(collage)collage.hidden=true;
 const image=root.querySelector('#tourPhoto');const photoUrl=x.photo?uri(x.photo.url):'';
 image.style.display=photoUrl?'block':'none';image.src=photoUrl;image.alt=x.name;
 const fallback=root.querySelector('#tourPhotoFallback');if(fallback){fallback.style.display=photoUrl?'none':'flex';fallback.textContent=`${x.name} · 사진 자료 준비 중`;}
 root.querySelector('#tourTitle').textContent=`${x.name} · 명소 ${x.landmarkIndex}/${x.landmarkTotal} · 장면 ${tourIndex+1}/${tourList.length}`;
 root.querySelector('#tourCaption').textContent=x.text;
 root.querySelector('#tourCredit').textContent=x.photo?`${x.photo.confirmed?'확인된 사진':'온라인 참고사진 · 검토 전'} · ${x.photo.title||''} · ${x.photo.artist||'Wikimedia Commons'} · ${x.photo.license||'이용조건 확인 필요'}`:'해당 명소의 사진을 아직 확보하지 못했습니다.';
 root.querySelector('#tourToggle').textContent=tourActive?'⏸ 잠시 멈추기':'▶ 계속 듣기';
}
function finishCountryTour(){
 tourActive=false;tourFinishing=true;const root=tourElement();
 if(!root)return;
 root.querySelector('#tourTitle').textContent=`${cName(tourCountryCode)} 사진 여행을 마쳤습니다`;
 root.querySelector('#tourCaption').textContent='오늘 가장 기억에 남는 명소는 어디인가요? 이제 이름표에서 마음에 드는 명소를 골라 사진과 이야기를 다시 살펴보세요.';
 root.querySelector('#tourToggle').textContent='🟢 명소 이름표 보기';
 root.querySelector('#tourCredit').textContent='여행을 마친 뒤에는 명소 이름표와 사진 카드를 살펴볼 수 있습니다.';
 root.querySelector('#tourPhoto').style.display='none';
 root.querySelector('#tourPhotoFallback').style.display='none';
 // 모자이크는 실제 이번 여행에서 표시한 서로 다른 사진을 다시 사용합니다.
 const collage=root.querySelector('#tourCollage');
 if(collage){
  collage.replaceChildren();
  const seen=new Set();
  const photos=tourList.filter(x=>x.photo&&uri(x.photo.url)).filter(x=>{const key=x.photo.url;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,12);
  photos.forEach(x=>{const img=document.createElement('img');img.src=uri(x.photo.url);img.alt=x.name;img.loading='eager';img.onerror=()=>img.remove();collage.appendChild(img);});
  const label=document.createElement('div');label.className='tour-collage-center';
  const heading=document.createElement('strong');heading.textContent=cName(tourCountryCode);
  const sub=document.createElement('span');sub.textContent='우리의 사진 여행';
  label.append(heading,sub);collage.appendChild(label);
  collage.hidden=false;
 }
 root.querySelector('#tourPrev').style.display='none';root.querySelector('#tourNext').style.display='none';
 const message='사진 여행을 마쳤습니다. 가장 마음에 남은 명소는 어디인가요? 이제 명소의 이름표를 누르면서 사진과 이야기를 더 자세히 살펴보세요.';
 if(!guideSupported())return;
 const run=++tourRun;
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.lang='ko-KR';u.rate=.94;
 u.onend=()=>{/* 추억 모자이크를 감상하고 버튼으로 명소 목록으로 이동 */};
 u.onerror=()=>{/* 종료 화면은 계속 표시 */};speechSynthesis.speak(u);}catch(e){/* finish button remains usable */}
}
function showCountryAfterTour(){const code=tourCountryCode;stopCountryTour();state.country=code;state.countrySearch='';state.countryFilter='all';state.countryCardsVisible=false;state.view='countries';state.countryExpanded=false;render();window.scrollTo({top:0,behavior:'instant'});requestAnimationFrame(()=>document.querySelector('.nameplate-grid')?.scrollIntoView({behavior:'smooth',block:'center'}));}
function narrateCountryTour(){
 const run=++tourRun;if(!tourActive)return;
 const x=tourList[tourIndex];if(!x)return;
 drawCountryTour();
 if(!guideSupported()){tourActive=false;drawCountryTour();notify('이 기기에서는 음성합성을 사용할 수 없습니다. 사진과 자막으로 감상해 주세요.');return;}
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(x.text);u.lang='ko-KR';u.rate=.94;
 u.onend=()=>{if(run!==tourRun||!tourActive)return;if(tourIndex+1<tourList.length){tourIndex++;narrateCountryTour();}else{finishCountryTour();}};
 u.onerror=()=>{if(run===tourRun){tourActive=false;drawCountryTour();}};
 speechSynthesis.speak(u);
 }catch(e){tourActive=false;drawCountryTour();}
}
async function startCountryTour(code){
 guideStop();tourCountryCode=code;tourFinishing=false;const run=++tourRun;tourPending=true;
 const prev=document.getElementById('tourPrev'),next=document.getElementById('tourNext');if(prev)prev.style.display='';if(next)next.style.display='';
 const root=tourElement();root.classList.add('open');root.setAttribute('aria-hidden','false');
 root.querySelector('#tourTitle').textContent=`${cName(code)} 사진 여행을 준비하고 있습니다`;
 root.querySelector('#tourCaption').textContent='등록된 명소의 사진을 확인하고 있습니다. 잠시 기다려 주세요.';
 root.querySelector('#tourPhoto').style.display='none';
 root.querySelector('#tourPhotoFallback').style.display='flex';root.querySelector('#tourPhotoFallback').textContent='🌍 사진 여행 준비 중';
 root.querySelector('#tourCredit').textContent='사진은 네트워크 상태에 따라 표시되지 않을 수 있습니다.';
 const list=await makeCountryTour(code);if(run!==tourRun)return;
 tourPending=false;tourList=list;
 if(!list.length){stopCountryTour();notify('등록된 명소가 없습니다. 먼저 명소를 등록해 주세요.');return;}
 tourIndex=0;tourActive=true;drawCountryTour();narrateCountryTour();
}
function advanceCountryTour(delta){if(!tourList.length||tourPending)return;tourRun++;try{speechSynthesis.cancel();}catch(_){}tourIndex=Math.max(0,Math.min(tourList.length-1,tourIndex+delta));if(tourActive)narrateCountryTour();else drawCountryTour();}
function toggleCountryTour(){if(tourFinishing){showCountryAfterTour();return;}if(!tourList.length||tourPending)return;tourActive=!tourActive;tourRun++;try{speechSynthesis.cancel();}catch(_){}if(tourActive)narrateCountryTour();else drawCountryTour();}

function render(){controls();const mapping={home:renderHome,countries:renderCountries,landmarks:renderLandmarks,photos:renderPhotos,search:renderSearch,wish:()=>renderSaved('wish'),favorites:()=>renderSaved('favorite'),parent:renderParent};$('#view').innerHTML=(mapping[state.view]||renderHome)();observePhotos();}
function refreshPhotoNode(id){const f=getLandmark(id);if(!f)return;document.querySelectorAll('[data-photo-for="'+keyPhoto(id)+'"]').forEach(el=>{const picture=namedPhoto(f);const img=el.querySelector('img');const fallback=el.querySelector('.photo-fallback');const tag=el.querySelector('.photo-tag');if(picture){if(img){img.src=uri(picture.url);img.style.display='block';}else{const im=document.createElement('img');im.src=uri(picture.url);im.alt=f.name;im.loading='lazy';im.addEventListener('error',()=>{im.style.display='none';if(fallback)fallback.style.display='flex';});el.insertBefore(im,fallback);}if(fallback)fallback.style.display='none';}if(tag)tag.textContent=photoTag(f);});}
function observePhotos(){photosObserver?.disconnect();if('IntersectionObserver' in window){photosObserver=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){const id=e.target.dataset.photoFor;photosObserver.unobserve(e.target);loadWikiPhoto(id);}}},{rootMargin:'150px'});document.querySelectorAll('[data-photo-for]').forEach(x=>{if(wikiCache.has(x.dataset.photoFor))refreshPhotoNode(x.dataset.photoFor);else photosObserver.observe(x);});}else document.querySelectorAll('[data-photo-for]').forEach(x=>loadWikiPhoto(x.dataset.photoFor));}
async function fetchJSON(url){const controller=new AbortController(),t=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(url,{signal:controller.signal,mode:'cors',credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}finally{clearTimeout(t);}}
async function loadWikiPhoto(id){const f=getLandmark(id);if(!f||wikiCache.has(id)||!(f.wikiTitle||f.aliases?.length))return;wikiCache.set(id,null);try{const lang=/^[a-z-]+$/.test(f.wikiLang||'')?f.wikiLang:'en';const url=new URL(`https://${lang}.wikipedia.org/w/api.php`);Object.entries({action:'query',format:'json',origin:'*',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'1400',titles:f.wikiTitle||f.aliases[0],redirects:'1'}).forEach(([k,v])=>url.searchParams.set(k,v));const d=await fetchJSON(url);const pages=Object.values(d.query?.pages||{});const pic=pages.find(p=>p.thumbnail?.source);if(pic&&uri(pic.thumbnail.source))wikiCache.set(id,{url:pic.thumbnail.source,thumb:pic.thumbnail.source,title:pic.pageimage||f.wikiTitle,source:wikiLink(f),license:'출처에서 확인 필요',artist:'',confirmed:false});else wikiCache.set(id,null);refreshPhotoNode(id);if(state.detailId===id)updateModalPhoto();}catch(e){wikiCache.set(id,null);refreshPhotoNode(id);}}
function toggleList(field,id){const v=edits[field],has=v.includes(id);edits[field]=has?v.filter(x=>x!==id):[...v,id];if(save()){if(state.detailId===id)showDetail(id);else render();notify(has?'목록에서 제외했습니다.':'목록에 저장했습니다.');}}
let guideRun=0;
let tourRun=0,tourList=[],tourIndex=0,tourActive=false;
function guideSupported(){return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;}
function guideCaption(f,p,i){
 const custom=(p&&typeof p.guideText==='string')?p.guideText.trim():'';
 if(custom)return custom;
 if(i===0){return `지금부터 ${f.name}을 함께 둘러볼까요? ${f.region?f.region+'에 있는 ':''}${f.name}입니다. ${f.description||'이곳은 어떤 모습일까요? 사진을 자세히 살펴보세요.'}`;}
 return `${f.name}의 ${i+1}번째 사진입니다. 첫 번째 사진과 어떤 점이 다른지 살펴보세요. 눈에 띄는 부분을 찾아볼까요?`;
}
function guideStop(){guideRun++;state.guidePlaying=false;if(guideSupported())try{window.speechSynthesis.cancel();}catch(_){}const x=document.querySelector('#guideStatus');if(x)x.textContent='가이드가 멈췄습니다.';}
function guideStatus(msg){const x=document.querySelector('#guideStatus');if(x)x.textContent=msg;}
function guideStep(run,single=false){
 if(run!==guideRun||!state.guidePlaying)return;
 const f=getLandmark(state.detailId);if(!f){guideStop();return;}
 const pics=gallery(f),i=state.galleryIndex,caption=guideCaption(f,pics[i],i);
 updateModalPhoto();guideStatus(`🎙️ ${i+1}/${Math.max(pics.length,1)}번째 장면을 설명하는 중입니다.`);
 if(!guideSupported()){guideStop();alert('이 기기에서는 음성 읽기를 지원하지 않습니다. 글로 안내를 확인해 주세요.');return;}
 const speech=new SpeechSynthesisUtterance(caption);speech.lang='ko-KR';speech.rate=.92;
 speech.onend=()=>{if(run!==guideRun||!state.guidePlaying)return;if(!single&&i+1<pics.length){state.galleryIndex=i+1;guideStep(run);}else{state.guidePlaying=false;guideStatus('🎉 관광가이드 여행을 마쳤습니다. 다시 들을 수 있어요.');updateModalPhoto();}};
 speech.onerror=e=>{if(run!==guideRun)return;state.guidePlaying=false;guideStatus('음성 재생을 완료하지 못했습니다. 다시 시작해 주세요.');};
 try{window.speechSynthesis.speak(speech);}catch(e){guideStop();}
}
function editGuideCaption(id){
 if(!state.admin)return;const f=getLandmark(id);if(!f)return;
 const photos=f.photos||[],current=gallery(f)[state.galleryIndex];if(!current||!current.confirmed)return;
 const index=photos.findIndex(p=>p.url===current.url);if(index<0)return;
 const value=prompt('이 사진을 보여주면서 들려줄 관광가이드 설명을 입력해 주세요.',photos[index].guideText||guideCaption(f,current,state.galleryIndex));
 if(value===null)return;if(value.length>1400){alert('설명을 1400자 이내로 작성해 주세요.');return;}
 const updated=photos.map((p,i)=>i===index?{...p,guideText:value.trim()}:p);
 if(seedMap.has(id))edits.overrides[id]={...(edits.overrides[id]||{}),photos:updated};
 else{const j=edits.added.findIndex(x=>x.id===id);if(j>=0)edits.added[j]={...edits.added[j],photos:updated};}
 if(save()){guideStop();updateModalPhoto();notify('사진별 관광가이드 설명을 저장했습니다.');}
}
function guideStart(){
 if(!state.detailId)return;
 guideStop();state.guidePlaying=true;
 const run=++guideRun;guideStep(run);
}
function showDetail(id){guideStop();const f=getLandmark(id);if(!f)return;state.detailId=id;state.galleryIndex=0;state.commonsMsg='';$('#detailOverlay').classList.add('open');$('#detailOverlay').setAttribute('aria-hidden','false');renderDetail(f);loadWikiPhoto(id);}
const CARD_SUMMARIES={
 'FR-L01':'파리의 하늘에 우뚝 선 에펠탑은 1889년 만국박람회를 위해 만들어진 철탑입니다. 가까이 다가가면 수많은 철제 부재가 그물처럼 연결된 구조를 볼 수 있습니다. 처음에는 외관을 두고 논쟁이 있었지만, 오늘날에는 파리를 대표하는 상징이 되었습니다. 높은 철탑의 실루엣은 파리의 거리와 센강 주변 어디에서나 눈에 띄며, 밤에는 조명으로 더욱 선명해집니다.',
 'FR-L02':'루브르 박물관은 원래 요새와 왕궁으로 사용되던 건물에서 세계적인 미술관으로 발전한 곳입니다. 넓은 궁전 건물 사이에는 현대적인 유리 피라미드가 자리합니다. 수백 년 된 건축과 새로운 건축이 한 공간에서 만나는 모습이 흥미롭습니다. 이곳에는 레오나르도 다빈치의 「모나리자」와 고대 조각품 등 서로 다른 시대의 작품이 모여 있습니다.',
 'FR-L03':'몽생미셸은 프랑스 노르망디 해안의 바위섬 위에 자리한 수도원과 마을입니다. 섬 위로 층층이 쌓인 건물과 높은 수도원 탑이 마치 동화 속 성처럼 보입니다. 특히 이곳은 밀물과 썰물에 따라 주변 바다와 갯벌의 모습이 달라지는 것으로 유명합니다. 섬으로 이어지는 길과 넓은 갯벌은 조수의 흐름에 따라 달라져, 수도원과 주변 바다가 만들어내는 독특한 풍경을 완성합니다.',
 'FR-L04':'베르사유 궁전은 프랑스 왕실의 권력과 화려한 문화를 보여 주는 곳입니다. 루이 14세 시대에 크게 확장되었고, 궁전 내부의 거울의 방은 빛과 장식이 어우러진 대표적인 공간입니다. 바깥으로 나가면 기하학적으로 꾸민 넓은 정원과 분수를 만날 수 있습니다. 거울의 방과 대칭을 이루는 정원은 당시 왕실이 건축과 조경을 통해 권위를 표현했던 방식을 잘 보여 줍니다.',
 'FR-L05':'샹젤리제 거리는 파리의 콩코르드 광장과 에투알 개선문을 잇는 유명한 거리입니다. 넓은 도로 옆으로 나무와 상점, 카페가 늘어서 있고 멀리 개선문이 시선을 끕니다. 프랑스의 국경일 행사나 자전거 경기 투르 드 프랑스의 마지막 구간으로도 잘 알려져 있습니다. 직선으로 길게 뻗은 가로수길과 양끝의 역사적 광장은 파리 도시계획의 특징을 보여 줍니다.',
 'FR-L06':'에투알 개선문은 나폴레옹이 프랑스 군대의 승리를 기념하기 위해 건립을 명한 거대한 기념문입니다. 완공은 나폴레옹 사후인 1836년에 이루어졌습니다. 외벽의 인물 조각과 전투 이름들은 프랑스 역사의 한 부분을 보여 줍니다. 개선문 아래에는 제1차 세계대전 전몰자를 기리는 무명용사의 무덤과 꺼지지 않는 불꽃이 있습니다.',
 'FR-L07':'노트르담 대성당은 파리 센강의 시테섬에 자리한 대표적인 고딕 건축물입니다. 뾰족하게 솟은 탑, 정교한 돌 조각, 둥근 장미창에서 중세 건축의 아름다움을 느낄 수 있습니다. 2019년 큰 화재를 겪은 뒤 복원 작업이 진행되었고 2024년 다시 문을 열었습니다. 정면의 세 개 출입문과 높은 장미창, 성당 외벽을 지탱하는 부벽은 고딕 건축의 특징입니다.',
 'FR-L08':'베르동 협곡은 프랑스 남동부의 석회암 지대를 오랜 세월 강물이 깎아 만든 깊은 협곡입니다. 가파른 절벽 사이로 에메랄드빛 물길이 굽이쳐 흐르는 모습이 특히 인상적입니다. 위에서 내려다본 협곡과 물가에서 바라본 절벽은 전혀 다른 느낌을 줍니다. 깊은 협곡을 따라 이어지는 절벽과 강물의 색은 이 지역의 석회암 지형과 자연을 대표합니다.'
};
function detailNeighbors(f){const a=allLandmarks().filter(x=>x.countryCode===f.countryCode);const idx=a.findIndex(x=>x.id===f.id);return {prev:idx>0?a[idx-1]:null,next:idx>=0&&idx<a.length-1?a[idx+1]:null,index:idx,total:a.length};}
function stepDetail(delta){const f=getLandmark(state.detailId);if(!f)return;const n=detailNeighbors(f);const dest=delta<0?n.prev:n.next;if(!dest)return;showDetail(dest.id);const modal=$('#detailOverlay');if(modal)modal.scrollTop=0;}
function renderDetail(f){const photos=gallery(f),p=photos[state.galleryIndex]||photos[0];const isFav=edits.favorite.includes(f.id),isWish=edits.wish.includes(f.id);const approvedCount=(f.photos||[]).length,neighbors=detailNeighbors(f);$('#detailContent').innerHTML=`<div class="modal-top"><div><span class="eyebrow">${esc(COUNTRY_MAP.get(f.countryCode)?.flag)} ${esc(cName(f.countryCode))} · ${esc(f.region)}</span><h2>${esc(f.name)}</h2><div class="pill-row"><span class="pill ${f.verified?'green':'purple'}">${f.verified?'✅ 설명 확인':'🔎 이름·설명 검토 초안'}</span><span class="pill">${esc(typeEmoji(f.category))} ${esc(category(f.category).name)}</span>${(f.extraCategories||[]).map(k=>`<span class="pill blue">${esc(category(k).name)}</span>`).join('')}</div></div><button class="close" data-act="close-detail" aria-label="닫기">✕</button></div>
 <div class="modal-photo-main"><div class="detail-photo-toolbar"><button class="btn blue btn-small" data-act="search-commons" data-id="${esc(f.id)}">📷 다른 사진 찾아보기</button></div><div class="photo-frame landscape" data-act="expand-photo"><img src="${esc(uri(p?.url||''))}" alt="${esc(f.name)}" style="${p?'':'display:none'}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="photo-fallback" style="${p?'display:none':''}"><span class="symbol">${esc(typeEmoji(f.category))}</span><b>${esc(f.name)}</b><span class="small">사진을 찾아보세요</span></div></div></div>
 <div class="photo-credit">${p?`${p.confirmed?'✅ 부모가 선택한 사진':'🔎 자동으로 찾은 참고사진 · 일치와 라이선스 미확인'} · ${esc(p.title||f.name)} · ${esc(p.artist||'저작자 표기 확인 필요')} · ${esc(p.license||'출처 확인 필요')} ${p.licenseUrl?`· <a class="link" target="_blank" rel="noopener noreferrer" href="${esc(uri(p.licenseUrl))}">라이선스 ↗</a>`:''} ${p.source?`· <a class="link" target="_blank" rel="noopener noreferrer" href="${esc(uri(p.source))}">원본 ↗</a>`:''}`:'대표사진 미확보 · 인터넷에 연결되어 있다면 명소 사진을 불러올 수 있습니다.'}</div>
 ${photos.length?`<div class="gallery-strip">${photos.map((ph,i)=>`<button class="gallery-thumb ${i===state.galleryIndex?'active':''}" data-act="pick-gallery" data-index="${i}" aria-label="사진 ${i+1}"><img src="${esc(uri(ph.thumb||ph.url))}" alt="사진 ${i+1}" loading="lazy"></button>`).join('')}</div>`:''}

 <div class="desc-section"><h3>📖 어떤 곳일까요?</h3><p class="lead">${esc((edits.overrides[f.id]&&Object.prototype.hasOwnProperty.call(edits.overrides[f.id],'description'))?f.description:(CARD_SUMMARIES[f.id]||f.description||'명소의 특징을 설명하는 자료를 준비하고 있습니다.'))}</p></div>
 <div class="action-row"><button class="btn ${isWish?'primary':''}" data-act="toggle-wish" data-id="${esc(f.id)}">${isWish?'⭐ 가보고 싶어요 ✓':'☆ 가보고 싶어요'}</button><button class="btn ${isFav?'primary':''}" data-act="toggle-fav" data-id="${esc(f.id)}">${isFav?'❤️ 즐겨찾기 ✓':'♡ 즐겨찾기'}</button><a class="btn ghost" href="${esc(uri(wikiLink(f)))}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">📚 출처 문서 보기 ↗</a>${state.admin?`<button class="btn blue" data-act="edit-place" data-id="${esc(f.id)}">✏️ 이름·설명 수정</button>`:''}</div>
 <div class="detail-place-navigation"><button class="btn" data-act="detail-prev" ${neighbors.prev?'':'disabled'}>← 이전 명소${neighbors.prev?` · ${esc(neighbors.prev.name)}`:''}</button><span class="detail-position">${neighbors.index+1} / ${neighbors.total}</span><button class="btn" data-act="detail-next" ${neighbors.next?'':'disabled'}>다음 명소${neighbors.next?` · ${esc(neighbors.next.name)}`:''} →</button></div>
 <div id="commonsArea">${state.commonsMsg?`<div class="loading">${esc(state.commonsMsg)}</div>`:''}${renderCommons(f)}</div>`;
}
function updateModalPhoto(){if(!state.detailId)return;const f=getLandmark(state.detailId);if(!f)return;const oldScroll=$('#detailOverlay').scrollTop;renderDetail(f);$('#detailOverlay').scrollTop=oldScroll;}
function renderCommons(f){const cached=commonsCache.get(f.id);if(!cached)return '';return `<div class="line"></div><h3>🔍 추가 사진 후보 (${cached.length}장)</h3><div class="warning">⚠️ 자동검색 결과입니다. 다른 장소 또는 비슷한 사진이 섞여 있을 수 있습니다. <b>사진과 장소의 일치 여부 및 사용조건을 꼭 확인</b>해 주세요.</div>${cached.length?`<div class="photo-candidate-grid">${cached.map((ph,i)=>`<div class="candidate-photo"><img src="${esc(uri(ph.thumb||ph.url))}" alt="${esc(ph.title)}" loading="lazy"><p><b>${esc(ph.title)}</b></p><p>이용조건: ${esc(ph.license||'정보 없음')}</p><a class="link small" href="${esc(uri(ph.source))}" target="_blank" rel="noopener noreferrer">원본·저작자 확인 ↗</a>${state.admin?`<div class="action-row"><button class="btn btn-small green" data-act="approve-photo" data-id="${esc(f.id)}" data-index="${i}" ${!ph.allowed?'disabled title="사진 사용조건을 먼저 확인해야 합니다"':''}>사진첩에 추가</button></div>`:'<p class="muted small">부모모드에서 사진을 선택할 수 있어요.</p>'}</div>`).join('')}</div>`:'<div class="blank">사진을 찾지 못했습니다. 영어/현지어 별칭이나 인터넷 연결을 확인해 주세요.</div>'}`;}
function setGallery(n){const f=getLandmark(state.detailId),len=gallery(f).length;if(!len)return;state.galleryIndex=(n+len)%len;updateModalPhoto();}
function openLightbox(){const f=getLandmark(state.detailId);if(!f)return;const photos=gallery(f);if(!photos.length)return;state.lightbox=photos;state.photoIndex=state.galleryIndex;state.zoom=1;$('#photoOverlay').classList.add('open');$('#photoOverlay').setAttribute('aria-hidden','false');updateLightbox();}
function updateLightbox(){const p=state.lightbox[state.photoIndex];if(!p)return;$('#photoCounter').textContent=`${state.photoIndex+1} / ${state.lightbox.length}`;$('#lightboxImage').src=uri(p.url);$('#lightboxImage').style.transform=`scale(${state.zoom})`;$('#photoAttribution').textContent=`${p.title||''} · ${p.license||'이용조건 확인 필요'}${p.artist?' · '+p.artist:''}`;}
async function findCommons(id){if(state.commonsLoading)return;const f=getLandmark(id);if(!f)return;state.commonsLoading=true;state.commonsMsg='위키미디어 공용에서 다양한 사진을 찾아보고 있습니다…';updateModalPhoto();try{const alias=(f.aliases||[]).find(a=>/^[\x00-\x7F\s\-’]+$/.test(a))||f.wikiTitle||f.name;const u=new URL('https://commons.wikimedia.org/w/api.php');const search=`${alias} ${f.region||''}`.trim();Object.entries({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:search,gsrnamespace:'6',gsrlimit:'16',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'720',iiextmetadatafilter:'LicenseShortName|Artist|Credit|UsageTerms'}).forEach(([k,v])=>u.searchParams.set(k,v));const d=await fetchJSON(u);const pictures=Object.values(d.query?.pages||{}).sort((a,b)=>(a.index||0)-(b.index||0));const items=pictures.map(p=>{const x=p.imageinfo?.[0];if(!x||!/^image\/(jpeg|png|webp)$/i.test(x.mime||''))return null;const meta=x.extmetadata||{},lic=meta.LicenseShortName?.value||meta.UsageTerms?.value||'';const author=(meta.Artist?.value||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').slice(0,250);return {title:p.title||'',url:x.url,thumb:x.thumburl||x.url,source:x.descriptionurl||'',license:lic,artist:author,allowed:/\bCC\s*(?:BY|0)|public\s*domain|^PD\b|GFDL/i.test(lic)};}).filter(x=>x&&uri(x.url));commonsCache.set(id,items);state.commonsMsg=items.length?'원본과 라이선스를 확인해 주세요.':'조건에 맞는 사진을 찾지 못했습니다.';}catch(e){commonsCache.set(id,[]);state.commonsMsg='온라인 사진검색에 연결하지 못했습니다. 인터넷이나 위키미디어 접속을 확인해 주세요.';}finally{state.commonsLoading=false;updateModalPhoto();}}
function approvePhoto(id,index){if(!state.admin)return notify('부모모드를 먼저 켜 주세요.');const f=getLandmark(id),ph=commonsCache.get(id)?.[index];if(!f||!ph||!ph.allowed)return alert('사진의 이용조건이 확인되지 않아 추가할 수 없습니다.');if(!confirm(`이 사진이 실제로 “${f.name}”을 보여주는지 원본에서 확인하셨나요?\n\n라이선스: ${ph.license}\n\n정확성이 확인된 경우에만 사진첩에 추가합니다.`))return;const images=(f.photos||[]).slice();if(images.some(p=>p.source===ph.source))return notify('이미 사진첩에 등록된 사진입니다.');images.push({...ph,hero:!images.length,confirmed:true});edits.overrides[id]={...(edits.overrides[id]||{}),photos:images};if(save()){state.galleryIndex=images.length-1;notify('사진첩에 추가했습니다.');render();updateModalPhoto();}}
function setView(view){if(tourActive)stopCountryTour();if(view==='parent'&&!state.admin){state.view=view;render();return;}state.view=view;render();window.scrollTo({top:0,behavior:'instant'});}
function editRecord(id){if(!state.admin){notify('부모모드를 켜 주세요.');return;}state.editorId=id;$('#detailOverlay').classList.remove('open');state.detailId='';state.view='parent';render();$('#editArea')?.scrollIntoView({behavior:'smooth',block:'start'});}
function addRecord(form){const fd=new FormData(form),id=String(fd.get('id')||'').trim(),name=String(fd.get('name')||'').trim(),countryCode=String(fd.get('countryCode')||'');if(!name||!COUNTRY_MAP.has(countryCode))return alert('명소 이름과 나라를 확인해 주세요.');const aliases=[...new Set(String(fd.get('aliases')||'').split(/[,\n;]+/).map(s=>s.trim()).filter(Boolean))];const record={countryCode,name,category:String(fd.get('category')||'nature'),extraCategories:fd.get('extraCategory')?[String(fd.get('extraCategory'))]:[],region:String(fd.get('region')||'').trim(),qid:String(fd.get('qid')||'').trim(),aliases,description:String(fd.get('description')||'').trim(),wikiLang:'en',wikiTitle:String(fd.get('wikiTitle')||'').trim(),verified:fd.get('verified')==='on',status:fd.get('verified')==='on'?'완성':'초안'};if(record.qid&&allLandmarks().some(x=>x.id!==id&&x.qid===record.qid))return alert('같은 위키데이터 QID가 다른 명소에 이미 등록되어 있습니다. 중복 항목을 먼저 확인해 주세요.');if(id){const old=getLandmark(id);if(!old)return alert('수정할 항목을 찾지 못했습니다.');if(old.countryCode!==countryCode)return alert('기존 항목의 나라 변경은 중복 방지를 위해 제한합니다. 새 항목으로 등록해 주세요.');if(!record.name)return; if(norm(old.name)!==norm(record.name)||(old.qid||'')!==(record.qid||'')||JSON.stringify(old.aliases||[])!==JSON.stringify(record.aliases)){record.nameAudit=null;record.selectionStatus='이름·별칭 직접 수정, 재검토 필요';} if(seedMap.has(id))edits.overrides[id]={...(edits.overrides[id]||{}),...record};else{const a=edits.added.findIndex(x=>x.id===id);if(a<0)return;edits.added[a]={...edits.added[a],...record};}}else{if(allLandmarks().some(x=>x.countryCode===countryCode&&norm(x.name)===norm(name)))return alert('같은 나라에 동일한 명소 이름이 등록되어 있습니다.');record.id=countryCode+'-U'+Date.now().toString(36);record.photos=[];record.source='user';edits.added.push(record);}if(save()){state.pendingResearch=null;const itemId=id||record.id;state.editorId=itemId;notify('명소 정보를 안전하게 저장했습니다.');render();}}
async function findWikidata(q){if(state.wikidataLoading)return;state.wikidataLoading=true;state.wikidataMessage='위키데이터 검색 중…';state.wikidataResults=[];render();try{let a=[];for(const language of ['ko','en']){const u=new URL('https://www.wikidata.org/w/api.php');Object.entries({action:'wbsearchentities',format:'json',origin:'*',language,uselang:language,search:q,limit:'8'}).forEach(([k,v])=>u.searchParams.set(k,v));const d=await fetchJSON(u);a.push(...(d.search||[]));}const m=new Map();a.forEach(v=>{if(!m.has(v.id))m.set(v.id,{id:v.id,label:v.label||'',description:v.description||''});});state.wikidataResults=[...m.values()].slice(0,12);state.wikidataMessage=`${state.wikidataResults.length}개 후보를 찾았습니다. 관광지인지, 나라가 맞는지 원본을 확인하세요.`;}catch(e){state.wikidataResults=[];state.wikidataMessage='위키데이터에 연결하지 못했습니다. 인터넷과 사이트 연결을 확인해 주세요.';}finally{state.wikidataLoading=false;render();}}
function useWikidata(qid){const r=state.wikidataResults.find(x=>x.id===qid);if(!r)return;inspectResearch(qid,'',state.researchCountry,null);}
function downloadBackup(){const exportData={format:'world-landmarks-stage01-backup-v1',app:'세계 명소대백과',version:BASE.version,exported:new Date().toISOString(),edits};const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='World_Landmarks_Backup_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);notify('명소대백과 백업 파일을 만들었습니다.');}
async function restoreBackup(file){if(!file||!state.admin)return;let raw;try{raw=JSON.parse(await file.text());}catch(e){return alert('읽을 수 있는 JSON 파일이 아닙니다.');}if(raw.format!=='world-landmarks-stage01-backup-v1'||!raw.edits||!Array.isArray(raw.edits.added)||!Array.isArray(raw.edits.favorite)||!Array.isArray(raw.edits.wish))return alert('명소대백과 Stage 0.1용 백업 파일이 아닙니다. 음식대백과 백업과 섞이지 않도록 보호합니다.');if(!confirm(`명소대백과의 현재 수정·저장자료를 백업 파일(${raw.exported||'날짜 미상'})로 바꾸시겠습니까?\n현재 자료는 먼저 백업하는 것이 안전합니다.`))return;const before=edits;edits={added:raw.edits.added,overrides:raw.edits.overrides||{},countryOverviews:raw.edits.countryOverviews||{},favorite:raw.edits.favorite,wish:raw.edits.wish};if(!save()){edits=before;return;}state.editorId='';render();notify('명소대백과 자료를 복원했습니다.');}
const listen=(sel,fn)=>document.addEventListener('change',e=>{if(e.target.matches(sel))fn(e.target)});
listen('#importBackup',input=>{restoreBackup(input.files?.[0]);input.value='';});
listen('#overviewCode',input=>{state.country=input.value;const t=$('#overviewText');if(t)t.value=countryIntro(COUNTRY_MAP.get(input.value));});
listen('#photoCountrySelect',input=>{state.photoCountry=input.value;render();});
listen('#researchCountrySelect',input=>{state.researchCountry=input.value;state.researchDiscovery=[];state.researchPreview=null;state.researchMessage='';render();});
listen('#researchCategorySelect',input=>{state.researchCategory=input.value;state.researchDiscovery=[];state.researchPreview=null;state.researchMessage='';render();});
$('#parentToggle').addEventListener('click',()=>{state.admin=!state.admin;if(!state.admin&&state.view==='parent')state.editorId='';render();notify(state.admin?'부모모드를 켰습니다.':'부모모드를 껐습니다.');});
document.addEventListener('submit',e=>{const id=e.target.getAttribute('id');if(!['countryForm','landmarkSearchForm','wikidataForm','placeEditForm','overviewForm'].includes(id))return;e.preventDefault();if(id==='countryForm'){state.countrySearch=$('#countryInput').value.trim();render();}if(id==='landmarkSearchForm'){state.search=$('#landmarkSearchInput').value.trim();render();}if(id==='wikidataForm'){const q=$('#wikidataInput').value.trim();state.wikidataQuery=q;if(q)findWikidata(q);else notify('검색어를 입력해 주세요.');}if(id==='placeEditForm'&&state.admin)addRecord(e.target);if(id==='overviewForm'&&state.admin){const fd=new FormData(e.target),code=String(fd.get('code'));if(COUNTRY_MAP.has(code)){edits.countryOverviews[code]=String(fd.get('overview')||'').trim();if(save()){notify('나라 공통설명을 저장했습니다.');render();}}}});
document.addEventListener('click',e=>{if(e.target.id==='detailOverlay'){closeDetail();return;}const el=e.target.closest('[data-go],[data-act]');if(!el)return;const id=el.dataset.id,act=el.dataset.act,go=el.dataset.go;if(go){setView(go);return;}switch(act){case 'open-detail':showDetail(id);break;case 'close-detail':closeDetail();break;case 'detail-prev':stepDetail(-1);break;case 'detail-next':stepDetail(1);break;case 'toggle-wish':toggleList('wish',id);break;case 'toggle-fav':toggleList('favorite',id);break;case 'cat-go':state.cat=el.dataset.cat;setView('landmarks');break;case 'filter-cat':state.cat=el.dataset.cat;render();break;case 'filter-photo-cat':state.photoCat=el.dataset.cat;render();break;case 'set-country':state.country=el.dataset.code;state.countrySearch='';state.countryCardsVisible=false;state.countryFilter='all';render();break;case 'country-go':state.country=el.dataset.code;state.countrySearch='';state.countryCardsVisible=false;state.countryFilter='all';setView('countries');break;case 'country-clear':state.countrySearch='';render();break;case 'toggle-all-countries':showAllCountries=!showAllCountries;state.countryExpanded=false;render();break;case 'start-country-tour':startCountryTour(el.dataset.code);break;case 'tour-close':if(tourFinishing)showCountryAfterTour();else stopCountryTour();break;case 'tour-next':if(tourFinishing)showCountryAfterTour();else advanceCountryTour(1);break;case 'tour-prev':advanceCountryTour(-1);break;case 'tour-toggle':toggleCountryTour();break;case 'toggle-country-list':state.countryExpanded=!state.countryExpanded;render();break;case 'toggle-country-cards':state.countryCardsVisible=!state.countryCardsVisible;render();break;case 'country-filter':state.countryFilter=el.dataset.cat;render();break;case 'guide-start':guideStart();break;case 'guide-stop':guideStop();updateModalPhoto();break;case 'guide-read':guideStop();state.guidePlaying=true;guideStep(++guideRun,true);break;case 'pick-gallery':guideStop();state.galleryIndex=Number(el.dataset.index)||0;updateModalPhoto();break;case 'gallery-prev':guideStop();setGallery(state.galleryIndex-1);break;case 'gallery-next':guideStop();setGallery(state.galleryIndex+1);break;case 'expand-photo':openLightbox();break;case 'close-photo':$('#photoOverlay').classList.remove('open');$('#photoOverlay').setAttribute('aria-hidden','true');break;case 'photo-prev':state.photoIndex=(state.photoIndex+state.lightbox.length-1)%state.lightbox.length;state.zoom=1;updateLightbox();break;case 'photo-next':state.photoIndex=(state.photoIndex+1)%state.lightbox.length;state.zoom=1;updateLightbox();break;case 'photo-zoom-in':state.zoom=Math.min(3,state.zoom+.4);updateLightbox();break;case 'photo-zoom-out':state.zoom=Math.max(1,state.zoom-.4);updateLightbox();break;case 'search-commons':findCommons(id);break;case 'approve-photo':approvePhoto(id,Number(el.dataset.index));break;case 'edit-guide-caption':editGuideCaption(id);break;case 'inspect-seed':inspectSeed(id);break;case 'inspect-discovery':inspectDiscovery(el.dataset.qid);break;case 'discover-landmarks':discoverLandmarks();break;case 'approve-research':approveResearch();break;case 'research-to-editor':researchToEditor();break;case 'clear-research':state.researchPreview=null;state.researchPreviewError='';render();break;case 'parent-new':state.pendingResearch=null;state.editorId='';state.view='parent';render();$('#editArea')?.scrollIntoView({behavior:'smooth'});break;case 'edit-place':editRecord(id);break;case 'use-wikidata':useWikidata(el.dataset.qid);break;case 'download-backup':downloadBackup();break;case 'delete-added':if(state.admin&&!seedMap.has(id)&&confirm('사용자가 추가한 이 명소를 삭제할까요? 삭제 전 백업을 권장합니다.')){edits.added=edits.added.filter(f=>f.id!==id);edits.wish=edits.wish.filter(k=>k!==id);edits.favorite=edits.favorite.filter(k=>k!==id);delete edits.overrides[id];if(save()){state.editorId='';render();}}break;}});
function closeDetail(){guideStop();$('#detailOverlay').classList.remove('open');$('#detailOverlay').setAttribute('aria-hidden','true');state.detailId='';}
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('#countryTour')?.classList.contains('open')){stopCountryTour();return;}if($('#photoOverlay').classList.contains('open')){$('#photoOverlay').classList.remove('open');return;}if($('#detailOverlay').classList.contains('open'))closeDetail();});
let startTouch=null;
$('#photoOverlay').addEventListener('touchstart',e=>{if(e.touches.length===1)startTouch=e.touches[0].clientX;else startTouch=null;},{passive:true});
$('#photoOverlay').addEventListener('touchend',e=>{if(startTouch===null||state.zoom>1||!e.changedTouches[0])return;const dx=e.changedTouches[0].clientX-startTouch;startTouch=null;if(Math.abs(dx)>65&&state.lightbox.length){state.photoIndex=(state.photoIndex+(dx<0?1:-1)+state.lightbox.length)%state.lightbox.length;updateLightbox();}},{passive:true});
render();
})();
