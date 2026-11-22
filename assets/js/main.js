/* INNOVIO VC — site interactions (no cookies, no trackers)
   Email: messages are sent directly from the site (FormSubmit, no visitor mail app needed),
   with fallbacks: mail app, Gmail, Outlook web, copy. */
(function(){
  var EMAIL='ciprian.ghioc@innoviovc.com', WA='40724393484';
  var ENDPOINT='https://formsubmit.co/ajax/'+EMAIL;
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
  function send(form,d,btn){
    var box=statusBox(form);
    if(!d.name||!(d.phone||d.email)){box.className='send-status warn';box.innerHTML='<p>'+T.need+'</p>';return}
    var old=btn?btn.innerHTML:'';
    if(btn){btn.disabled=true;btn.textContent=T.sending}
    box.className='send-status';box.innerHTML='';
    var payload={_subject:subj(d),_template:'table',_captcha:'false',Nume:d.name,Telefon:d.phone||'',Email:d.email||'',Companie:d.company||'',Domeniu:d.topic||'',Apel:d.call||'',Link:d.url||'',Mesaj:d.msg||'',Pagina:location.href,Limba:LANG};
    if(d.email)payload._replyto=d.email;
    var ctrl=('AbortController' in window)?new AbortController():null; var tm=setTimeout(function(){ctrl&&ctrl.abort()},15000);
    fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),signal:ctrl?ctrl.signal:undefined})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){return {ok:r.ok,j:j}})})
      .then(function(res){
        clearTimeout(tm); if(btn){btn.disabled=false;btn.innerHTML=old}
        var good=res.ok&&(res.j.success===true||res.j.success==='true');
        if(good){box.className='send-status ok';box.innerHTML='<p>'+T.ok+'</p>';$$('input,textarea',form).forEach(function(i){if(i.type!=='hidden')i.value=''})}
        else showFallback(box,d);
      })
      .catch(function(){clearTimeout(tm);if(btn){btn.disabled=false;btn.innerHTML=old}showFallback(box,d)});
  }

  // ---- modal (apply / generic email) ----
  var modal=$('#apply-modal');
  if(modal){
    var mform=$('form',modal), cur={};
    // add optional email field if missing
    if(!$('[name=a_email]',modal)){
      var lab=document.createElement('label');lab.innerHTML=T.emailLbl+'<input name="a_email" type="email" autocomplete="email">';
      var comp=$('[name=a_company]',modal); comp&&comp.parentNode.parentNode.insertBefore(lab,comp.parentNode.nextSibling);
    }
    var title=$('#apply-title',modal), title0=title?title.textContent:'';
    function openM(call,url){
      cur={call:call||'',url:url||''};
      var cn=$('.call-name',modal);
      if(call){cn.textContent=call;cn.hidden=false;title.textContent=title0}else{cn.hidden=true;title.textContent=T.title}
      var st=$('.send-status',modal); if(st){st.className='send-status';st.innerHTML=''}
      modal.classList.add('open');modal.setAttribute('aria-hidden','false');var f=$('input',modal);f&&f.focus()}
    function closeM(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
    document.addEventListener('click',function(e){
      var b=e.target.closest('[data-apply]');
      if(b){e.preventDefault();openM(b.getAttribute('data-call'),b.getAttribute('data-url'));return}
      // any plain mailto link on the site -> open the send form (works without a mail app)
      var m=e.target.closest('a[href^="mailto:"]');
      if(m&&!m.closest('.send-status')){e.preventDefault();openM('','');return}
      if(e.target===modal||e.target.closest('.modal-close'))closeM();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeM()});
    function data(){return {call:cur.call,url:cur.url,name:$('[name=a_name]',modal).value.trim(),company:$('[name=a_company]',modal).value.trim(),phone:$('[name=a_phone]',modal).value.trim(),email:($('[name=a_email]',modal)||{value:''}).value.trim(),msg:$('[name=a_msg]',modal).value.trim()}}
    $('[data-send=email]',modal).addEventListener('click',function(){send(mform,data(),this)});
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
    function fd(){return {name:v('name'),company:v('company'),phone:v('phone'),email:v('email'),topic:v('topic'),msg:v('msg')}}
    lf.addEventListener('submit',function(e){e.preventDefault();send(lf,fd(),lf.querySelector('button[type=submit]'))});
    var wb=lf.querySelector('[data-send=wa]'); wb&&wb.addEventListener('click',function(){window.open(wa(fd()),'_blank','noopener')});
  }

  // ---- funding page: search + filters ----
  var list=$('#calls');
  if(list&&$('#call-search')){
    var q=$('#call-search'), active='all', cards=$$('.call',list), cnt=$('#call-count');
    function apply(){var s=q.value.toLowerCase().trim(),k=0;
      cards.forEach(function(c){var ok=(active==='all'||(c.getAttribute('data-cat')||'').indexOf(active)>-1)&&(!s||c.textContent.toLowerCase().indexOf(s)>-1);c.hidden=!ok;if(ok)k++});
      if(cnt)cnt.textContent=k}
    q.addEventListener('input',apply);
    $$('.filters button').forEach(function(b){b.addEventListener('click',function(){$$('.filters button').forEach(function(x){x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','true');active=b.getAttribute('data-f');apply()})});
    var h=location.hash.replace('#','');if(h){var fb=$('.filters button[data-f="'+h+'"]');fb&&fb.click()}
  }
})();
