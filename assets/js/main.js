/* INNOVIO VC — site interactions (no cookies, no trackers)
   Email: messages are sent directly from the site (Web3Forms, no visitor mail app needed),
   with fallbacks: mail app, Gmail, Outlook web, copy. */
(function(){
  var EMAIL='ciprian.ghioc@innoviovc.com', WA='40724393484';
  var ENDPOINT='https://api.web3forms.com/submit', W3F_KEY='5444c2c2-7363-4d6c-9645-3379139a4d9b'; // cheie publică Web3Forms (livrare pe Gmail)
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}
  var LANG=(document.documentElement.lang||'ro').slice(0,2), RO=LANG==='ro', ZH=LANG==='zh';
  var T={
    ro:{sending:'Se trimite…',ok:'Mulțumim! Mesajul a fost trimis. Vă răspundem în cel mai scurt timp.',
        fail:'Nu am putut trimite automat mesajul. Alegeți o variantă:',app:'Aplicația de email',copy:'Copiază mesajul',copied:'Mesajul a fost copiat. Lipiți-l într-un email către ',
        need:'Completați numele și un telefon sau un email de contact.',title:'Trimite un mesaj',sub:'Vă răspundem rapid pe email sau telefonic.',emailLbl:'Email (opțional)'},
    en:{sending:'Sending…',ok:'Thank you! Your message has been sent. We will get back to you shortly.',
        fail:'We could not send the message automatically. Choose an option:',app:'Email app',copy:'Copy message',copied:'Message copied. Paste it into an email to ',
        need:'Please enter your name and a phone number or email.',title:'Send a message',sub:'We reply quickly by email or phone.',emailLbl:'Email (optional)'},
    zh:{sending:'发送中…',ok:'谢谢！您的消息已发送，我们会尽快回复。',
        fail:'无法自动发送消息，请选择其他方式：',app:'邮件应用',copy:'复制消息',copied:'消息已复制，请粘贴到发送至以下地址的邮件中：',
        need:'请填写姓名以及电话或电子邮件。',title:'发送消息',sub:'我们会通过邮件或电话尽快回复。',emailLbl:'电子邮件（可选）'}
  }[LANG]||null;
  if(!T) T={sending:'Sending…',ok:'Thank you! Your message has been sent.',fail:'Choose an option:',app:'Email app',copy:'Copy message',copied:'Copied. Send it to ',need:'Please enter your name and a phone or email.',title:'Send a message',sub:'',emailLbl:'Email (optional)'};

  // honeypot anti-spam field on every lead form (invisible to people)
  $$('form.lead-form').forEach(function(f){if(!f.querySelector('[name=_honey]')){var h=document.createElement('input');h.type='text';h.name='_honey';h.className='hp';h.tabIndex=-1;h.setAttribute('autocomplete','off');h.setAttribute('aria-hidden','true');f.appendChild(h)}});

  // mobile nav
  var t=$('.nav-toggle'), n=$('.nav');
  if(t&&n){t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',o)});
    $$('.nav a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open')})})}
  $$('[data-year]').forEach(function(e){e.textContent=new Date().getFullYear()});

  function buildMsg(d){
    var L=[];
    if(RO){
      if(d.call){L.push('Bună ziua, domnule Ghioc,','','Doresc o ofertă de consultanță pentru apelul de finanțare:','„'+d.call+'”');if(d.url)L.push('Link: '+d.url);}
      else L.push('Bună ziua, domnule Ghioc,','','Doresc o discuție despre consultanță'+(d.topic?(' – '+d.topic):'')+'.');
    } else {
      if(d.call){L.push('Hello Mr Ghioc,','','I would like a consulting quote for this funding call:','"'+d.call+'"');if(d.url)L.push('Link: '+d.url);}
      else L.push('Hello Mr Ghioc,','','I would like to discuss consulting'+(d.topic?(' – '+d.topic):'')+'.');
    }
    L.push('');
    if(d.name)L.push((RO?'Nume: ':'Name: ')+d.name);
    if(d.company)L.push((RO?'Companie / instituție: ':'Company: ')+d.company);
    if(d.phone)L.push((RO?'Telefon: ':'Phone: ')+d.phone);
    if(d.email)L.push('Email: '+d.email);
    if(d.msg)L.push('',(RO?'Detalii: ':'Details: ')+d.msg);
    L.push('','('+(RO?'mesaj trimis de pe ':'sent from ')+'innoviovc.com'+(ZH?'/zh':'')+')');
    return L.join('\n');
  }
  function subj(d){return d.call?((RO?'Cerere ofertă – ':'Quote request – ')+d.call.slice(0,90)):((RO?'Cerere consultanță':'Consulting request')+(d.topic?(' – '+d.topic):'')+' (innoviovc.com)')}
  function mailto(d){return 'mailto:'+EMAIL+'?subject='+encodeURIComponent(subj(d))+'&body='+encodeURIComponent(buildMsg(d))}
  function gmail(d){return 'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(EMAIL)+'&su='+encodeURIComponent(subj(d))+'&body='+encodeURIComponent(buildMsg(d))}
  function outlook(d){return 'https://outlook.office.com/mail/deeplink/compose?to='+encodeURIComponent(EMAIL)+'&subject='+encodeURIComponent(subj(d))+'&body='+encodeURIComponent(buildMsg(d))}
  function wa(d){return 'https://wa.me/'+WA+'?text='+encodeURIComponent(buildMsg(d))}
  window.INNOVIO={mailto:mailto,wa:wa};

  // ---- status / fallback box attached to a form ----
  function statusBox(form){
    var b=$('.send-status',form);
    if(!b){b=document.createElement('div');b.className='send-status';b.setAttribute('role','status');b.setAttribute('aria-live','polite');form.appendChild(b)}
    return b;
  }
  function showFallback(box,d){
    box.className='send-status warn';
    box.innerHTML='<p>'+T.fail+'</p><div class="fb-btns">'+
      '<a class="btn btn-sm btn-primary" href="'+mailto(d).replace(/"/g,'&quot;')+'">'+T.app+'</a>'+
      '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="'+gmail(d).replace(/"/g,'&quot;')+'">Gmail</a>'+
      '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="'+outlook(d).replace(/"/g,'&quot;')+'">Outlook</a>'+
      '<button type="button" class="btn btn-sm btn-ghost fb-copy">'+T.copy+'</button></div>'+
      '<p class="fb-addr">'+EMAIL+'</p>';
    var c=$('.fb-copy',box);
    c.addEventListener('click',function(){
      var txt=subj(d)+'\n\n'+buildMsg(d);
      function done(){c.textContent='✓';$('.fb-addr',box).textContent=T.copied+EMAIL}
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done,function(){prompt('',txt)})}else{prompt('',txt)}
    });
  }
  var EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PHONE_RE=/^[+()\d\s.\-\/]{6,20}$/, lastSend=0;
  var E={ro:{name:'Introduceți numele.',contact:'Introduceți un telefon sau un email.',email:'Adresa de email nu este validă.',phone:'Numărul de telefon nu este valid.',wait:'Mesajul a fost deja trimis. Așteptați câteva secunde.'},
         en:{name:'Please enter your name.',contact:'Please enter a phone number or an email.',email:'The email address is not valid.',phone:'The phone number is not valid.',wait:'Message already sent. Please wait a few seconds.'},
         zh:{name:'请填写姓名。',contact:'请填写电话或电子邮件。',email:'电子邮件地址无效。',phone:'电话号码无效。',wait:'消息已发送，请稍候。'}}[LANG]||null;
  if(!E)E={name:'Please enter your name.',contact:'Please enter a phone number or an email.',email:'Invalid email.',phone:'Invalid phone.',wait:'Please wait.'};
  function clearErr(form){$$('[aria-invalid]',form).forEach(function(i){i.removeAttribute('aria-invalid');i.removeAttribute('aria-describedby')});$$('.field-err',form).forEach(function(x){x.remove()})}
  function markErr(form,name,msg){var el=form.querySelector('[name='+name+']');if(!el)return null;var id='err-'+name+'-'+Math.random().toString(36).slice(2,7);
    var m=document.createElement('span');m.className='field-err';m.id=id;m.textContent=msg;el.parentNode.appendChild(m);el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',id);return el}
  function validate(form,d,map){clearErr(form);var errs=[],first=null;map=map||{};
    function e(n,m){errs.push(m);var el=markErr(form,map[n]||n,m);first=first||el}
    if(!d.name||d.name.length<2)e('name',E.name);
    if(!d.phone&&!d.email)e('phone',E.contact);
    if(d.email&&!EMAIL_RE.test(d.email))e('email',E.email);
    if(d.phone&&!PHONE_RE.test(d.phone))e('phone',E.phone);
    if(first)first.focus();return errs}
  function send(form,d,btn,map){
    var box=statusBox(form);
    if(d.honey){box.className='send-status ok';box.innerHTML='<p>'+T.ok+'</p>';return}  // bot trap: silently drop
    var errs=validate(form,d,map);
    if(errs.length){box.className='send-status warn';box.innerHTML='<p>'+errs.join(' ')+'</p>';return}
    if(Date.now()-lastSend<20000){box.className='send-status warn';box.innerHTML='<p>'+E.wait+'</p>';return}
    d={name:d.name.slice(0,120),company:(d.company||'').slice(0,160),phone:(d.phone||'').slice(0,40),email:(d.email||'').slice(0,160),topic:(d.topic||'').slice(0,120),msg:(d.msg||'').slice(0,3000),call:(d.call||'').slice(0,300),url:(d.url||'').slice(0,500)};
    var old=btn?btn.innerHTML:'';
    if(btn){btn.disabled=true;btn.textContent=T.sending}
    box.className='send-status';box.innerHTML='';
    var payload={access_key:W3F_KEY,subject:subj(d),from_name:'innoviovc.com – '+d.name,botcheck:false,Nume:d.name,Telefon:d.phone||'',Email:d.email||'',Companie:d.company||'',Domeniu:d.topic||'',Apel:d.call||'',Link:d.url||'',Mesaj:d.msg||'',Pagina:location.origin+location.pathname,Limba:LANG};
    if(d.email)payload.replyto=d.email;
    var ctrl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ctrl&&ctrl.abort()},15000);
    fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),signal:ctrl?ctrl.signal:undefined})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){return {ok:r.ok,j:j}})})
      .then(function(res){
        clearTimeout(tm); if(btn){btn.disabled=false;btn.innerHTML=old}
        var good=res.ok&&(res.j.success===true||res.j.success==='true');
        if(good){lastSend=Date.now();box.className='send-status ok';box.innerHTML='<p>'+T.ok+'</p>';$$('input,textarea',form).forEach(function(i){if(i.type!=='hidden')i.value=''})}
        else showFallback(box,d);
      })
      .catch(function(){clearTimeout(tm);if(btn){btn.disabled=false;btn.innerHTML=old}showFallback(box,d)});
  }

  // ---- modal (apply / generic email): accessible dialog ----
  var modal=$('#apply-modal'), lastFocus=null;
  if(modal){
    var mform=$('form',modal), cur={};
    modal.setAttribute('aria-modal','true');
    if(!$('[name=a_email]',modal)){
      var lab=document.createElement('label');lab.innerHTML=T.emailLbl+'<input name="a_email" type="email" autocomplete="email" inputmode="email">';
      var comp=$('[name=a_company]',modal); comp&&comp.parentNode.parentNode.insertBefore(lab,comp.parentNode.nextSibling);
    }
    var title=$('#apply-title',modal), title0=title?title.textContent:'';
    function focusables(){return $$('a[href],button:not([disabled]),input:not([type=hidden]):not([tabindex="-1"]),textarea,select',modal).filter(function(el){return el.offsetParent!==null})}
    function openM(call,url){
      lastFocus=document.activeElement;
      cur={call:call||'',url:url||''};
      var cn=$('.call-name',modal);
      if(call){cn.textContent=call;cn.hidden=false;title.textContent=title0}else{cn.hidden=true;title.textContent=T.title}
      var st=$('.send-status',modal); if(st){st.className='send-status';st.innerHTML=''}
      clearErr(mform);
      modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
      var f=$('input[name=a_name]',modal);f&&f.focus()}
    function closeM(){if(!modal.classList.contains('open'))return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';
      if(lastFocus&&lastFocus.focus)lastFocus.focus()}
    document.addEventListener('click',function(e){
      var b=e.target.closest('[data-apply]');
      if(b){e.preventDefault();var cl=b.closest('.call'),ta=cl&&cl.querySelector('.call-t a, h2 a, h3 a');openM(b.getAttribute('data-call'),b.getAttribute('data-url')||(ta?ta.href:''));return}
      var w=e.target.closest('[data-wa-call]');
      if(w){var c2=w.closest('.call'),t2=c2&&c2.querySelector('.call-t a, h2 a, h3 a');if(t2){e.preventDefault();window.open(wa({call:t2.textContent.trim(),url:t2.href}),'_blank','noopener')}return}
      var m=e.target.closest('a[href^="mailto:"]');
      if(m&&!m.closest('.send-status')&&!m.hasAttribute('data-direct')){e.preventDefault();openM('','');return}
      if(e.target===modal||e.target.closest('.modal-close'))closeM();
    });
    document.addEventListener('keydown',function(e){
      if(!modal.classList.contains('open'))return;
      if(e.key==='Escape'){e.preventDefault();closeM();return}
      if(e.key==='Tab'){var f=focusables();if(!f.length)return;var first=f[0],last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
        else if(!modal.contains(document.activeElement)){e.preventDefault();first.focus()}}
    });
    function data(){return {call:cur.call,url:cur.url,name:$('[name=a_name]',modal).value.trim(),company:$('[name=a_company]',modal).value.trim(),phone:$('[name=a_phone]',modal).value.trim(),email:($('[name=a_email]',modal)||{value:''}).value.trim(),msg:$('[name=a_msg]',modal).value.trim(),honey:($('[name=_honey]',modal)||{value:''}).value}}
    function mSend(){send(mform,data(),$('[data-send=email]',modal),{name:'a_name',phone:'a_phone',email:'a_email'})}
    $('[data-send=email]',modal).addEventListener('click',mSend);
    mform.addEventListener('submit',function(e){e.preventDefault();mSend()});
    $('[data-send=wa]',modal).addEventListener('click',function(){window.open(wa(data()),'_blank','noopener')});
  }

  // ---- contact form (home pages) ----
  var lf=$$('form.lead-form').filter(function(f){return !f.closest('#apply-modal')})[0];
  if(lf){
    if(!lf.querySelector('[name=email]')){
      var l2=document.createElement('label');l2.innerHTML=T.emailLbl+'<input name="email" type="email" autocomplete="email">';
      var c2=lf.querySelector('[name=company]'); c2&&c2.parentNode.parentNode.insertBefore(l2,c2.parentNode.nextSibling);
    }
    function v(n){var el=lf.querySelector('[name='+n+']');return el?el.value.trim():''}
    function fd(){return {name:v('name'),company:v('company'),phone:v('phone'),email:v('email'),topic:v('topic'),msg:v('msg'),honey:v('_honey')}}
    lf.addEventListener('submit',function(e){e.preventDefault();send(lf,fd(),lf.querySelector('button[type=submit]'),{name:'name',phone:'phone',email:'email'})});
    var wb=lf.querySelector('[data-send=wa]'); wb&&wb.addEventListener('click',function(){window.open(wa(fd()),'_blank','noopener')});
  }

  // ---- stale-data notice on the funding page (if the feed is older than 4 days) ----
  var tUp=$('.updated time[datetime]');
  if(tUp&&$('#calls')){var age=(Date.now()-Date.parse(tUp.getAttribute('datetime')))/864e5;if(age>4){var w=document.createElement('p');w.className='send-status warn';w.setAttribute('role','status');w.textContent=(RO?'Atenție: lista a fost actualizată acum '+Math.floor(age)+' zile. Verificați termenele pe portalul oficial.':'Note: this list was last updated '+Math.floor(age)+' days ago. Check deadlines on the official portal.');var tb=$('.toolbar');tb&&tb.parentNode.insertBefore(w,tb)}}

  // ---- funding page: search + filters (diacritic-insensitive, combined, accessible) ----
  var list=$('#calls');
  if(list&&$('#call-search')){
    var q=$('#call-search'), active='all', cards=$$('.call',list), cnt=$('#call-count');
    function norm(x){return (x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ş/g,'s').replace(/ţ/g,'t')}
    cards.forEach(function(c,i){c._t=norm(c.textContent);c._i=i;c._dl=+c.getAttribute('data-dl')||0;c._op=+c.getAttribute('data-op')||0});
    var sortSel=$('#call-sort');
    function sortCards(mode){var a=cards.slice();
      a.sort(function(x,y){
        if(mode==='dl-asc'||mode==='dl-desc'){if(!x._dl&&!y._dl)return x._i-y._i;if(!x._dl)return 1;if(!y._dl)return -1;return mode==='dl-asc'?x._dl-y._dl:y._dl-x._dl}
        if(mode==='op-desc'){if(x._op!==y._op)return (y._op||0)-(x._op||0);return x._i-y._i}
        return x._i-y._i});
      a.forEach(function(c){list.appendChild(c)});cards=a}
    var empty=document.createElement('div');empty.className='calls-empty';empty.hidden=true;empty.setAttribute('role','status');
    empty.innerHTML='<p>'+(RO?'Niciun apel nu corespunde filtrelor alese.':ZH?'没有符合筛选条件的项目。':'No calls match the selected filters.')+'</p><button type="button" class="btn btn-sm btn-ghost" data-clear>'+(RO?'Resetează filtrele':ZH?'重置筛选':'Clear filters')+'</button>';
    list.parentNode.insertBefore(empty,list.nextSibling);
    if(cnt){cnt.setAttribute('aria-live','polite')}
    var PAGE=30, limit=PAGE;
    var more=document.createElement('div');more.className='calls-more';more.innerHTML='<button type="button" class="btn btn-ghost"></button>';
    empty.parentNode.insertBefore(more,empty.nextSibling);var moreBtn=more.firstChild;
    moreBtn.addEventListener('click',function(){var first=null;limit+=PAGE;apply(true);
      for(var i=0;i<cards.length;i++){if(!cards[i].hidden&&cards[i]._n===limit-PAGE){first=cards[i];break}}
      var a=first&&first.querySelector('a');a&&a.focus()});
    function apply(keep){if(!keep)limit=PAGE;var s=norm(q.value.trim()),terms=s.split(/\s+/).filter(Boolean),k=0;
      cards.forEach(function(c){var cat=(c.getAttribute('data-cat')||'');var ok=(active==='all'||cat.split(' ').indexOf(active)>-1)&&terms.every(function(t){return c._t.indexOf(t)>-1});
        c._n=ok?k:-1;c.hidden=!ok||k>=limit;if(ok)k++});
      var shown=Math.min(k,limit);
      if(cnt)cnt.textContent=k; empty.hidden=k>0;
      more.hidden=k<=limit; moreBtn.textContent=(RO?'Arată mai multe':ZH?'显示更多':'Show more')+' ('+(k-shown)+(RO?' rămase)':ZH?' 个剩余)':' remaining)')}
    function setF(f){active=f;$$('.filters button').forEach(function(x){x.setAttribute('aria-pressed',x.getAttribute('data-f')===f?'true':'false')});apply()}
    q.addEventListener('input',function(){apply()});
    if(sortSel)sortSel.addEventListener('change',function(){sortCards(sortSel.value);apply()});
    $$('.filters button').forEach(function(b){b.addEventListener('click',function(){setF(b.getAttribute('data-f'))})});
    empty.querySelector('[data-clear]').addEventListener('click',function(){q.value='';setF('all');q.focus()});
    var h=location.hash.replace('#','');if(h&&$('.filters button[data-f="'+h+'"]'))setF(h);else apply();
  }
})();
