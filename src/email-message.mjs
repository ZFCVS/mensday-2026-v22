const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function checkedUrl(value){const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new TypeError('Use a valid hosted card URL.');return url.href;}
export function buildEmailMessage({greeting,sender,cardUrl,createUrl}){
  const card=checkedUrl(cardUrl),create=checkedUrl(createUrl);
  return {
    html:`<div><p>${escapeHtml(greeting).replace(/\r\n|\r|\n/g,'<br>')}</p><p>From: ${escapeHtml(sender)}</p><p><a href="${escapeHtml(card)}">View your card</a></p><p><a href="${escapeHtml(create)}">Create a card for someone else</a></p></div>`,
    plain:`${greeting}\n\nFrom: ${sender}\n\nView your card: ${card}\nCreate a card for someone else: ${create}`,
    cardUrl:card,createUrl:create
  };
}
export function copyEmailMessage(clipboard,ClipboardItemConstructor,message){
  if(!clipboard?.write||typeof ClipboardItemConstructor!=='function')throw new Error('Formatted copy is unavailable. Select the message preview and copy it manually.');
  return clipboard.write([new ClipboardItemConstructor({'text/html':new Blob([message.html],{type:'text/html'}),'text/plain':new Blob([message.plain],{type:'text/plain'})})]);
}
