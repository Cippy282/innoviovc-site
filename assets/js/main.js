/* INNOVIO VC — site interactions (no cookies, no trackers) */
(function(){
  var EMAIL='ciprian.ghioc@innoviovc.com', WA='40724393484';
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}

  // mobile nav
  var t=$('.nav-toggle'), n=$('.nav');
  if(t&&n){t.addEventListener('click',function(){var o=n.classList.toggle('open');t.setAttribute('aria-expanded',o)});
    $$('.nav a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open')})})}

  // year
  $$('[data-year]').forEach(function(e){e.textContent=new Date().getFullYear()});

  var RO=(document.documentElement.lang||'ro').indexOf('ro')===0;
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
    if(d.msg)L.push('',(RO?'Detalii: ':'Details: ')+d.msg);
    L.push('','('+(RO?'mesaj trimis de pe ':'sent from ')+'innoviovc.com)');
    return L.join('\n');
  }
  function mailto(d){var s=d.call?((RO?'Cerere ofertă – ':'Quote request – ')+d.call.slice(0,90)):((RO?'Cerere consultanță':'Consulting request')+(d.topic?(' – '+d.topic):''));
    return 'mailto:'+EMAIL+'?subject='+encodeURIComponent(s)+'&body='+encodeURIComponent(buildMsg(d))}
  function wa(d){return 'https://wa.me/'+WA+'?text='+encodeURIComponent(buildMsg(d))}
  window.INNOVIO={mailto:mailto,wa:wa};

  // Apply modal
  var modal=$('#apply-modal');
  if(modal){
    var cur={};
    function openM(call,url){cur={call:call,url:url};$('.call-name',modal).textContent=call;modal.classList.add('open');modal.setAttribute('aria-hidden','false');var f=$('input',modal);f&&f.focus()}
    function closeM(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
    document.addEventListener('click',function(e){
      var b=e.target.closest('[data-apply]');
      if(b){e.preventDefault();openM(b.getAttribute('data-call'),b.getAttribute('data-url'))}
      if(e.target===modal||e.target.closest('.modal-close'))closeM();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeM()});
    function data(){return {call:cur.call,url:cur.url,name:$('[name=a_name]',modal).value.trim(),company:$('[name=a_company]',modal).value.trim(),phone:$('[name=a_phone]',modal).value.trim(),msg:$('[name=a_msg]',modal).value.trim()}}
    $('[data-send=email]',modal).addEventListener('click',function(){location.href=mailto(data())});
    $('[data-send=wa]',modal).addEventListener('click',function(){window.open(wa(data()),'_blank','noopener')});
  }

  // contact form
  var lf=$('form.lead-form');
  if(lf){
    function fd(){return {name:lf.name.value.trim(),company:lf.company.value.trim(),phone:lf.phone.value.trim(),topic:lf.topic.value,msg:lf.msg.value.trim()}}
    lf.addEventListener('submit',function(e){e.preventDefault();location.href=mailto(fd())});
    $('[data-send=wa]',lf).addEventListener('click',function(){window.open(wa(fd()),'_blank','noopener')});
  }

  // funding page: search + filters
  var list=$('#calls');
  if(list&&$('#call-search')){
    var q=$('#call-search'), active='all', cards=$$('.call',list), cnt=$('#call-count');
    function apply(){var s=q.value.toLowerCase().trim(),v=0;
      cards.forEach(function(c){var ok=(active==='all'||(c.getAttribute('data-cat')||'').indexOf(active)>-1)&&(!s||c.textContent.toLowerCase().indexOf(s)>-1);c.hidden=!ok;if(ok)v++});
      if(cnt)cnt.textContent=v}
    q.addEventListener('input',apply);
    $$('.filters button').forEach(function(b){b.addEventListener('click',function(){$$('.filters button').forEach(function(x){x.setAttribute('aria-pressed','false')});b.setAttribute('aria-pressed','true');active=b.getAttribute('data-f');apply()})});
    var h=location.hash.replace('#','');if(h){var fb=$('.filters button[data-f="'+h+'"]');fb&&fb.click()}
  }
})();
